import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/permissions';

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

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getOrCreateSettings();
    const config = normalizeWordpressConfig(settings.wordpressConfig);

    return NextResponse.json({
      config: {
        siteUrl: config.siteUrl,
        apiUsername: config.apiUsername,
        apiPassword: config.apiPassword,
        enabled: config.enabled,
        locationsEndpoint: config.locationsEndpoint,
        unitsEndpoint: config.unitsEndpoint,
      },
      cache: {
        locations: config.cachedLocations || [],
        units: config.cachedUnits || [],
        lastPulledAt: config.lastPulledAt || null,
        lastPullErrors: config.lastPullErrors || { locations: '', units: '' },
      },
    });
  } catch (error) {
    console.error('Failed to load WordPress pull cache:', error);
    return NextResponse.json({ error: 'Failed to load WordPress pull cache' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs: string[] = [];
    logs.push('Starting pull from WordPress...');

    const settings = await getOrCreateSettings();
    const config = normalizeWordpressConfig(settings.wordpressConfig);

    if (!config.enabled) {
      return NextResponse.json({ error: 'WordPress integration is disabled in settings.' }, { status: 400 });
    }

    if (!config.siteUrl || !config.apiUsername || !config.apiPassword) {
      return NextResponse.json({ error: 'Missing site URL or API credentials in settings.' }, { status: 400 });
    }

    const locationsUrl = buildWordPressUrl(config.siteUrl, config.locationsEndpoint);
    const unitsUrl = buildWordPressUrl(config.siteUrl, config.unitsEndpoint);
    logs.push(`Locations endpoint: ${locationsUrl}`);
    logs.push(`Units endpoint: ${unitsUrl}`);

    let locations: unknown[] = [];
    let units: unknown[] = [];
    let locationsError = '';
    let unitsError = '';

    try {
      logs.push('Pulling locations...');
      locations = await fetchWordPressArray(locationsUrl, config.apiUsername, config.apiPassword);
      logs.push(`Locations pulled: ${locations.length}`);
    } catch (error) {
      locationsError = error instanceof Error ? error.message : 'Failed to pull locations';
      logs.push(`Locations error: ${locationsError}`);
    }

    try {
      logs.push('Pulling units...');
      units = await fetchWordPressArray(unitsUrl, config.apiUsername, config.apiPassword);
      logs.push(`Units pulled: ${units.length}`);
    } catch (error) {
      unitsError = error instanceof Error ? error.message : 'Failed to pull units';
      logs.push(`Units error: ${unitsError}`);
    }

    const mergedConfig: WordPressConfig = {
      ...config,
      cachedLocations: locations,
      cachedUnits: units,
      lastPulledAt: new Date().toISOString(),
      lastPullErrors: {
        locations: locationsError,
        units: unitsError,
      },
    };

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        wordpressConfig: mergedConfig as Prisma.InputJsonValue,
      },
      select: { wordpressConfig: true },
    });

    const updatedConfig = normalizeWordpressConfig(updated.wordpressConfig);
    logs.push('Pull completed and cached in database.');

    return NextResponse.json({
      ok: true,
      logs,
      cache: {
        locations: updatedConfig.cachedLocations || [],
        units: updatedConfig.cachedUnits || [],
        lastPulledAt: updatedConfig.lastPulledAt || null,
        lastPullErrors: updatedConfig.lastPullErrors || { locations: '', units: '' },
      },
    });
  } catch (error) {
    console.error('WordPress pull failed:', error);
    return NextResponse.json({ error: 'Failed to pull from WordPress' }, { status: 500 });
  }
}
