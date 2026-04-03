import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';

const SETTINGS_SINGLETON_ID = 'default';

type WordPressConfig = {
  siteUrl: string;
  apiUsername: string;
  apiPassword: string;
  enabled: boolean;
  locationsEndpoint: string;
};

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function isMissingValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function normalizeWordpressConfig(input: unknown): WordPressConfig {
  const source = asRecord(input);
  return {
    siteUrl: typeof source.siteUrl === 'string' ? source.siteUrl : '',
    apiUsername: typeof source.apiUsername === 'string' ? source.apiUsername : '',
    apiPassword: typeof source.apiPassword === 'string' ? source.apiPassword : '',
    enabled: Boolean(source.enabled),
    locationsEndpoint: typeof source.locationsEndpoint === 'string' ? source.locationsEndpoint : 'wp-json/spaceman/v1/locations',
  };
}

function buildWordPressUrl(siteUrl: string, endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${siteUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

async function fetchWordPressArray(url: string, username: string, password: string) {
  const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Expected array response');
  }

  return payload as unknown[];
}

function readWordPressField(row: Record<string, unknown>, ...keys: string[]) {
  const acf = asRecord(row.acf);
  const meta = asRecord(row.meta);
  const allMeta = asRecord(row.all_meta);

  for (const key of keys) {
    const topLevelValue = row[key];
    if (!isMissingValue(topLevelValue)) return topLevelValue;

    const acfValue = acf[key];
    if (!isMissingValue(acfValue)) return acfValue;

    const metaValue = meta[key];
    if (!isMissingValue(metaValue)) return metaValue;

    const allMetaValue = allMeta[key];
    if (!isMissingValue(allMetaValue)) return allMetaValue;
  }

  return null;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtmlToLines(input: string): string[] {
  return decodeHtmlEntities(input)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function stripHtmlInline(input: string | null): string | null {
  if (!input) return null;
  const lines = stripHtmlToLines(input);
  if (lines.length === 0) return null;
  return lines.join(' | ');
}

function normalizePostcode(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase();
  const compact = cleaned.replace(/\s+/g, '');
  if (compact.length < 5) return cleaned;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function parseAddressBlock(addressHtmlOrText: string | null): {
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
} {
  if (!addressHtmlOrText) {
    return { addressLine1: null, addressLine2: null, townCity: null, county: null, postcode: null };
  }

  const lines = stripHtmlToLines(addressHtmlOrText);
  if (lines.length === 0) {
    return { addressLine1: null, addressLine2: null, townCity: null, county: null, postcode: null };
  }

  const companyPrefix = /^sentry\s+self\s+storage/i;
  const candidateLines = lines.filter((line) => !companyPrefix.test(line));
  const working = candidateLines.length > 0 ? [...candidateLines] : [...lines];

  let postcode: string | null = null;
  const postcodeRegex = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;
  for (let i = working.length - 1; i >= 0; i -= 1) {
    const match = working[i].match(postcodeRegex);
    if (match) {
      postcode = normalizePostcode(match[1]);
      working[i] = working[i].replace(postcodeRegex, '').replace(/[\s,]+$/g, '').trim();
      break;
    }
  }

  const cleaned = working.filter(Boolean);
  const lineCount = cleaned.length;
  const townCity = lineCount >= 2 ? cleaned[lineCount - 2] : null;
  const county = lineCount >= 1 ? cleaned[lineCount - 1] : null;
  const addressParts = lineCount > 2 ? cleaned.slice(0, lineCount - 2) : cleaned.slice(0, Math.max(0, lineCount - 1));

  return {
    addressLine1: addressParts[0] || null,
    addressLine2: addressParts.length > 1 ? addressParts.slice(1).join(', ') : null,
    townCity,
    county,
    postcode,
  };
}

function toNullableString(value: unknown): string | null {
  if (isMissingValue(value)) return null;
  return String(value).trim();
}

function toNullableNumber(value: unknown): number | null {
  if (isMissingValue(value)) return null;
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const locationId = typeof body.locationId === 'string' ? body.locationId : '';
    if (!locationId) {
      return NextResponse.json({ error: 'Location id is required.' }, { status: 400 });
    }

    const cmsLocation = await prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        slug: true,
        legacyId: true,
      },
    });

    if (!cmsLocation) {
      return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
    }

    const settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_SINGLETON_ID },
      select: { wordpressConfig: true },
    });
    const config = normalizeWordpressConfig(settings?.wordpressConfig);

    if (!config.enabled) {
      return NextResponse.json({ error: 'WordPress integration is disabled in settings.' }, { status: 400 });
    }

    if (!config.siteUrl || !config.apiUsername || !config.apiPassword) {
      return NextResponse.json({ error: 'Missing WordPress credentials in settings.' }, { status: 400 });
    }

    const endpoint = buildWordPressUrl(config.siteUrl, config.locationsEndpoint);
    const wpLocations = await fetchWordPressArray(endpoint, config.apiUsername, config.apiPassword);

    const match = wpLocations.find((entry) => {
      const row = asRecord(entry);
      const wpId = Number(row.id);
      const wpSlug = normalizeText(row.slug);
      const wpTitle = normalizeText(row.title);

      if (cmsLocation.legacyId !== null && Number.isFinite(wpId) && wpId === cmsLocation.legacyId) return true;
      if (cmsLocation.slug && wpSlug && wpSlug === normalizeText(cmsLocation.slug)) return true;
      if (wpTitle && wpTitle === normalizeText(cmsLocation.name)) return true;
      return false;
    });

    if (!match) {
      return NextResponse.json({ error: 'No matching WordPress location found for this CMS location.' }, { status: 404 });
    }

    const row = asRecord(match);
    const matchedBy =
      cmsLocation.legacyId !== null && Number(row.id) === cmsLocation.legacyId
        ? 'legacyId'
        : cmsLocation.slug && normalizeText(row.slug) === normalizeText(cmsLocation.slug)
          ? 'slug'
          : 'name/title';

    const mapData = asRecord(readWordPressField(row, 'location_map'));
    const parsedAddress = parseAddressBlock(toNullableString(readWordPressField(row, 'address')));

    const mappedFields = {
      addressLine1:
        toNullableString(readWordPressField(row, '_address_line_1', 'address_line_1', 'address1', 'address_line1')) ||
        parsedAddress.addressLine1 ||
        '',
      addressLine2:
        toNullableString(readWordPressField(row, '_address_line_2', 'address_line_2', 'address2', 'address_line2')) ||
        parsedAddress.addressLine2 ||
        toNullableString(readWordPressField(row, 'short_address')) ||
        '',
      townCity:
        toNullableString(readWordPressField(row, '_towncity', 'towncity', 'town_city', 'city')) ||
        toNullableString(mapData.city) ||
        parsedAddress.townCity ||
        '',
      county:
        toNullableString(readWordPressField(row, '_county', 'county')) ||
        toNullableString(mapData.state) ||
        parsedAddress.county ||
        '',
      postcode:
        normalizePostcode(
          toNullableString(readWordPressField(row, '_postcode', 'postcode', 'post_code')) ||
          toNullableString(mapData.post_code) ||
          parsedAddress.postcode
        ) || '',
      email: toNullableString(readWordPressField(row, 'email', 'Email Address', 'contact_email', 'email_address')) || '',
      phone: toNullableString(readWordPressField(row, 'phone', 'Telephone Number', 'telephone', 'contact_phone', 'telephone_number')) || '',
      openingHours:
        stripHtmlInline(toNullableString(readWordPressField(row, 'opening_hours', 'Opening Hours', 'openingHours', 'opening-hours'))) || '',
      latitude:
        String(
          toNullableNumber(readWordPressField(row, 'Location Map_lat', 'location_map_lat', 'latitude', 'lat')) ??
          toNullableNumber(mapData.lat) ??
          ''
        ).trim(),
      longitude:
        String(
          toNullableNumber(readWordPressField(row, 'Location Map_lng', 'location_map_lng', 'longitude', 'lng', 'lon')) ??
          toNullableNumber(mapData.lng) ??
          ''
        ).trim(),
    };

    return NextResponse.json({
      ok: true,
      matchedBy,
      wordpressId: row.id ?? null,
      wordpressTitle: row.title ?? null,
      mappedFields,
    });
  } catch (error) {
    console.error('Failed to enrich location from WordPress:', error);
    return NextResponse.json({ error: 'Failed to fetch WordPress location data.' }, { status: 500 });
  }
}
