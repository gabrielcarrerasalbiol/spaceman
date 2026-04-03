import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';

const SETTINGS_SINGLETON_ID = 'default';

type WordPressConfig = {
  siteUrl: string;
  apiUsername: string;
  apiPassword: string;
  enabled: boolean;
  locationsEndpoint: string;
  unitsEndpoint: string;
  cachedLocations?: unknown[];
  cachedUnits?: unknown[];
  lastPulledAt?: string;
  lastPullErrors?: {
    locations?: string;
    units?: string;
  };
};

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeWordpressConfig(input: unknown): WordPressConfig {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  return {
    siteUrl: typeof source.siteUrl === 'string' ? source.siteUrl : '',
    apiUsername: typeof source.apiUsername === 'string' ? source.apiUsername : '',
    apiPassword: typeof source.apiPassword === 'string' ? source.apiPassword : '',
    enabled: Boolean(source.enabled),
    locationsEndpoint: typeof source.locationsEndpoint === 'string' ? source.locationsEndpoint : 'wp-json/spaceman/v1/locations',
    unitsEndpoint: typeof source.unitsEndpoint === 'string' ? source.unitsEndpoint : 'wp-json/spaceman/v1/units',
    cachedLocations: Array.isArray(source.cachedLocations) ? source.cachedLocations : [],
    cachedUnits: Array.isArray(source.cachedUnits) ? source.cachedUnits : [],
    lastPulledAt: typeof source.lastPulledAt === 'string' ? source.lastPulledAt : '',
    lastPullErrors:
      source.lastPullErrors && typeof source.lastPullErrors === 'object'
        ? {
            locations:
              typeof (source.lastPullErrors as Record<string, unknown>).locations === 'string'
                ? ((source.lastPullErrors as Record<string, unknown>).locations as string)
                : '',
            units:
              typeof (source.lastPullErrors as Record<string, unknown>).units === 'string'
                ? ((source.lastPullErrors as Record<string, unknown>).units as string)
                : '',
          }
        : { locations: '', units: '' },
  };
}

function buildWordPressUrl(siteUrl: string, endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
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

async function getOrCreateSettings() {
  const existing = await prisma.settings.findUnique({
    where: { id: SETTINGS_SINGLETON_ID },
    select: { id: true, wordpressConfig: true },
  });

  if (existing) return existing;

  return prisma.settings.create({
    data: {
      id: SETTINGS_SINGLETON_ID,
      siteName: 'Skeleton',
      primaryColor: '#3b82f6',
      unitStatusConfig: {},
      wordpressConfig: {
        siteUrl: '',
        apiUsername: '',
        apiPassword: '',
        enabled: false,
        locationsEndpoint: 'wp-json/spaceman/v1/locations',
        unitsEndpoint: 'wp-json/spaceman/v1/units',
      },
    },
    select: { id: true, wordpressConfig: true },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function isMissingValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
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
  const normalized = decodeHtmlEntities(input)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return normalized;
}

function normalizePostcode(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase();
  const compact = cleaned.replace(/\s+/g, '');
  if (compact.length < 5) return cleaned;

  const spaced = `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  return spaced;
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
  const filteredLines = lines.filter((line) => !companyPrefix.test(line));
  const candidateLines = filteredLines.length > 0 ? filteredLines : lines;

  let postcode: string | null = null;
  const postcodeRegex = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;
  for (let i = candidateLines.length - 1; i >= 0; i -= 1) {
    const match = candidateLines[i].match(postcodeRegex);
    if (match) {
      postcode = normalizePostcode(match[1]);
      candidateLines[i] = candidateLines[i].replace(postcodeRegex, '').replace(/[\s,]+$/g, '').trim();
      break;
    }
  }

  const cleaned = candidateLines.filter(Boolean);
  const lineCount = cleaned.length;

  const townCity = lineCount >= 2 ? cleaned[lineCount - 2] : null;
  const county = lineCount >= 1 ? cleaned[lineCount - 1] : null;
  const addressParts = lineCount > 2 ? cleaned.slice(0, lineCount - 2) : cleaned.slice(0, Math.max(0, lineCount - 1));
  const addressLine1 = addressParts[0] || null;
  const addressLine2 = addressParts.length > 1 ? addressParts.slice(1).join(', ') : null;

  return {
    addressLine1,
    addressLine2,
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

function isCmsMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logs: string[] = [];
    logs.push('Starting WordPress locations pull...');

    const settings = await getOrCreateSettings();
    const config = normalizeWordpressConfig(settings.wordpressConfig);

    if (!config.enabled) {
      return NextResponse.json({ error: 'WordPress integration is disabled in settings.' }, { status: 400 });
    }

    if (!config.siteUrl || !config.apiUsername || !config.apiPassword) {
      return NextResponse.json({ error: 'Missing site URL or API credentials in settings.' }, { status: 400 });
    }

    const locationsUrl = buildWordPressUrl(config.siteUrl, config.locationsEndpoint);
    logs.push(`Locations endpoint: ${locationsUrl}`);

    const pulledLocations = await fetchWordPressArray(locationsUrl, config.apiUsername, config.apiPassword);
    logs.push(`Pulled ${pulledLocations.length} locations from WordPress.`);

    const mergedConfig: WordPressConfig = {
      ...config,
      cachedLocations: pulledLocations,
      lastPulledAt: new Date().toISOString(),
      lastPullErrors: {
        locations: '',
        units: config.lastPullErrors?.units || '',
      },
    };

    await prisma.settings.update({
      where: { id: settings.id },
      data: {
        wordpressConfig: mergedConfig as Prisma.InputJsonValue,
      },
    });

    const cmsLocations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        legacyId: true,
        addressLine1: true,
        addressLine2: true,
        townCity: true,
        county: true,
        postcode: true,
        email: true,
        phone: true,
        openingHours: true,
        latitude: true,
        longitude: true,
      },
    });

    const byLegacyId = new Map<number, (typeof cmsLocations)[number]>();
    const bySlug = new Map<string, (typeof cmsLocations)[number]>();
    const byName = new Map<string, (typeof cmsLocations)[number]>();

    for (const location of cmsLocations) {
      if (location.legacyId !== null) byLegacyId.set(location.legacyId, location);
      if (location.slug) bySlug.set(normalizeText(location.slug), location);
      if (location.name) byName.set(normalizeText(location.name), location);
    }

    let matchedLocations = 0;
    let unmatchedLocations = 0;
    let updatedLocations = 0;
    let unchangedMatchedLocations = 0;

    for (const entry of pulledLocations) {
      const row = asRecord(entry);
      const acf = asRecord(row.acf);
      const wpId = Number(row.id);
      const wpSlug = normalizeText(row.slug);
      const wpTitle = normalizeText(row.title);

      let matchedLocation: (typeof cmsLocations)[number] | undefined;
      let matchedBy = '';

      if (Number.isFinite(wpId)) {
        matchedLocation = byLegacyId.get(wpId);
        if (matchedLocation) matchedBy = 'legacyId';
      }

      if (!matchedLocation && wpSlug) {
        matchedLocation = bySlug.get(wpSlug);
        if (matchedLocation) matchedBy = 'slug';
      }

      if (!matchedLocation && wpTitle) {
        matchedLocation = byName.get(wpTitle);
        if (matchedLocation) matchedBy = 'name/title';
      }

      if (!matchedLocation) {
        unmatchedLocations += 1;
        continue;
      }

      matchedLocations += 1;

      const mapData = asRecord(readWordPressField(row, 'location_map'));
      const parsedAddress = parseAddressBlock(toNullableString(readWordPressField(row, 'address')));

      const nextAddressLine1 = toNullableString(readWordPressField(row, '_address_line_1', 'address_line_1', 'address1', 'address_line1')) || parsedAddress.addressLine1;
      const nextAddressLine2 = toNullableString(readWordPressField(row, '_address_line_2', 'address_line_2', 'address2', 'address_line2')) || parsedAddress.addressLine2 || toNullableString(readWordPressField(row, 'short_address'));
      const nextTownCity = toNullableString(readWordPressField(row, '_towncity', 'towncity', 'town_city', 'city')) || toNullableString(mapData.city) || parsedAddress.townCity;
      const nextCounty = toNullableString(readWordPressField(row, '_county', 'county')) || toNullableString(mapData.state) || parsedAddress.county;
      const nextPostcode = normalizePostcode(toNullableString(readWordPressField(row, '_postcode', 'postcode', 'post_code')) || toNullableString(mapData.post_code) || parsedAddress.postcode);
      const nextEmail = toNullableString(readWordPressField(row, 'email', 'Email Address', 'contact_email', 'email_address'));
      const nextPhone = toNullableString(readWordPressField(row, 'phone', 'Telephone Number', 'telephone', 'contact_phone', 'telephone_number'));
      const nextOpeningHours = toNullableString(readWordPressField(row, 'opening_hours', 'Opening Hours', 'openingHours', 'opening-hours'));
      const nextLatitude = toNullableNumber(readWordPressField(row, 'Location Map_lat', 'location_map_lat', 'latitude', 'lat')) ?? toNullableNumber(mapData.lat);
      const nextLongitude = toNullableNumber(readWordPressField(row, 'Location Map_lng', 'location_map_lng', 'longitude', 'lng', 'lon')) ?? toNullableNumber(mapData.lng);

      if (Object.keys(acf).length > 0) {
        logs.push(`Matched ${matchedLocation.name} (${matchedBy}) with ACF payload.`);
      }

      const updateData: Record<string, unknown> = {};

      if (isCmsMissing(matchedLocation.addressLine1) && nextAddressLine1) updateData.addressLine1 = nextAddressLine1;
      if (isCmsMissing(matchedLocation.addressLine2) && nextAddressLine2) updateData.addressLine2 = nextAddressLine2;
      if (isCmsMissing(matchedLocation.townCity) && nextTownCity) updateData.townCity = nextTownCity;
      if (isCmsMissing(matchedLocation.county) && nextCounty) updateData.county = nextCounty;
      if (isCmsMissing(matchedLocation.postcode) && nextPostcode) updateData.postcode = nextPostcode;
      if (isCmsMissing(matchedLocation.email) && nextEmail) updateData.email = nextEmail;
      if (isCmsMissing(matchedLocation.phone) && nextPhone) updateData.phone = nextPhone;
      if (isCmsMissing(matchedLocation.openingHours) && nextOpeningHours) updateData.openingHours = nextOpeningHours;
      if (matchedLocation.latitude === null && nextLatitude !== null) updateData.latitude = nextLatitude;
      if (matchedLocation.longitude === null && nextLongitude !== null) updateData.longitude = nextLongitude;

      const updateKeys = Object.keys(updateData);
      if (updateKeys.length === 0) {
        unchangedMatchedLocations += 1;
        continue;
      }

      await prisma.location.update({
        where: { id: matchedLocation.id },
        data: updateData,
      });

      updatedLocations += 1;
      logs.push(`Updated ${matchedLocation.name} (${matchedBy}) with ${updateKeys.length} missing field${updateKeys.length > 1 ? 's' : ''}.`);
    }

    logs.push('Location sync complete.');

    return NextResponse.json({
      ok: true,
      logs,
      summary: {
        pulledLocations: pulledLocations.length,
        matchedLocations,
        unmatchedLocations,
        updatedLocations,
        unchangedMatchedLocations,
      },
    });
  } catch (error) {
    console.error('WordPress location pull and missing-field sync failed:', error);
    return NextResponse.json({ error: 'Failed to pull WordPress locations and sync missing fields' }, { status: 500 });
  }
}
