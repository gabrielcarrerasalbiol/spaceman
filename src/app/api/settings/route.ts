import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { DEFAULT_STATUS_CONFIG, normalizeStatusConfig } from '@/lib/status-config';

const SETTINGS_SINGLETON_ID = 'default';

function isMissingWordpressConfigColumn(error: unknown) {
  const candidate = error as { code?: string; meta?: { column?: string } } | null;
  return candidate?.code === 'P2022' && candidate?.meta?.column === 'settings.wordpressConfig';
}

async function ensureWordpressConfigColumn() {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE settings ADD COLUMN IF NOT EXISTS "wordpressConfig" JSONB NOT NULL DEFAULT \'{}\'::jsonb'
    );
  } catch (error) {
    console.warn('Could not auto-ensure settings.wordpressConfig column:', error);
  }
}

function normalizeWordpressConfig(input: unknown) {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  return {
    siteUrl: typeof source.siteUrl === 'string' ? source.siteUrl : '',
    apiUsername: typeof source.apiUsername === 'string' ? source.apiUsername : '',
    apiPassword: typeof source.apiPassword === 'string' ? source.apiPassword : '',
    enabled: Boolean(source.enabled),
    locationsEndpoint: typeof source.locationsEndpoint === 'string' ? source.locationsEndpoint : 'wp-json/spaceman/v1/locations',
    unitsEndpoint: typeof source.unitsEndpoint === 'string' ? source.unitsEndpoint : 'wp-json/spaceman/v1/units',
  };
}

function normalizeHubspotConfig(input: unknown) {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  return {
    apiKey: typeof source.apiKey === 'string' ? source.apiKey : '',
    portalId: typeof source.portalId === 'string' ? source.portalId : '',
    enabled: Boolean(source.enabled),
    lastSync: typeof source.lastSync === 'string' ? source.lastSync : null,
  };
}

async function getOrCreateSettings() {
  await ensureWordpressConfigColumn();

  const withWordpressSelect = {
    id: true,
    siteName: true,
    siteLogo: true,
    siteDescription: true,
    primaryColor: true,
    unitStatusConfig: true,
    hubspotConfig: true,
    wordpressConfig: true,
  };

  const fallbackSelect = {
    id: true,
    siteName: true,
    siteLogo: true,
    siteDescription: true,
    primaryColor: true,
    unitStatusConfig: true,
  };

  try {
    const byDefaultId = await prisma.settings.findUnique({
      where: { id: SETTINGS_SINGLETON_ID },
      select: withWordpressSelect,
    });
    if (byDefaultId) return byDefaultId;

    const existing = await prisma.settings.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: withWordpressSelect,
    });
    if (existing) return existing;

    return prisma.settings.create({
      data: {
        id: SETTINGS_SINGLETON_ID,
        siteName: 'Skeleton',
        siteLogo: null,
        siteDescription: null,
        primaryColor: '#3b82f6',
        unitStatusConfig: DEFAULT_STATUS_CONFIG,
        hubspotConfig: normalizeHubspotConfig(null),
        wordpressConfig: normalizeWordpressConfig(null),
      },
      select: withWordpressSelect,
    });
  } catch (error) {
    if (!isMissingWordpressConfigColumn(error)) {
      throw error;
    }

    const byDefaultId = await prisma.settings.findUnique({
      where: { id: SETTINGS_SINGLETON_ID },
      select: fallbackSelect,
    });
    if (byDefaultId) {
      return {
        ...byDefaultId,
        hubspotConfig: normalizeHubspotConfig(null),
        wordpressConfig: normalizeWordpressConfig(null),
      };
    }

    const existing = await prisma.settings.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: fallbackSelect,
    });
    if (existing) {
      return {
        ...existing,
        hubspotConfig: normalizeHubspotConfig(null),
        wordpressConfig: normalizeWordpressConfig(null),
      };
    }

    const created = await prisma.settings.create({
      data: {
        id: SETTINGS_SINGLETON_ID,
        siteName: 'Skeleton',
        siteLogo: null,
        siteDescription: null,
        primaryColor: '#3b82f6',
        unitStatusConfig: DEFAULT_STATUS_CONFIG,
      },
      select: fallbackSelect,
    });

    return {
      ...created,
      hubspotConfig: normalizeHubspotConfig(null),
      wordpressConfig: normalizeWordpressConfig(null),
    };
  }
}

// GET /api/settings - Get site settings
export async function GET() {
  try {
    const settings = await getOrCreateSettings();

    return NextResponse.json({
      siteName: settings.siteName,
      siteLogo: settings.siteLogo || null,
      siteDescription: settings.siteDescription || null,
      primaryColor: settings.primaryColor,
      unitStatusConfig: normalizeStatusConfig(settings.unitStatusConfig),
      hubspotConfig: normalizeHubspotConfig(settings.hubspotConfig),
      wordpressConfig: normalizeWordpressConfig(settings.wordpressConfig),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update site settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { siteName, siteLogo, siteDescription, primaryColor, unitStatusConfig, hubspotConfig, wordpressConfig } = body;

    if (wordpressConfig !== undefined) {
      await ensureWordpressConfigColumn();
    }

    const settings = await getOrCreateSettings();

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        ...(siteName !== undefined && { siteName }),
        ...(siteLogo !== undefined && { siteLogo }),
        ...(siteDescription !== undefined && { siteDescription }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(unitStatusConfig !== undefined && { unitStatusConfig: normalizeStatusConfig(unitStatusConfig) }),
        ...(hubspotConfig !== undefined && {
          hubspotConfig: {
            ...(settings.hubspotConfig && typeof settings.hubspotConfig === 'object'
              ? (settings.hubspotConfig as Record<string, unknown>)
              : {}),
            ...normalizeHubspotConfig(hubspotConfig),
          },
        }),
        ...(wordpressConfig !== undefined && {
          wordpressConfig: {
            ...(settings.wordpressConfig && typeof settings.wordpressConfig === 'object'
              ? (settings.wordpressConfig as Record<string, unknown>)
              : {}),
            ...normalizeWordpressConfig(wordpressConfig),
          },
        }),
      },
      select: {
        id: true,
        siteName: true,
        siteLogo: true,
        siteDescription: true,
        primaryColor: true,
        unitStatusConfig: true,
        hubspotConfig: true,
        wordpressConfig: true,
      },
    });

    return NextResponse.json({
      siteName: updated.siteName,
      siteLogo: updated.siteLogo || null,
      siteDescription: updated.siteDescription || null,
      primaryColor: updated.primaryColor,
      unitStatusConfig: normalizeStatusConfig(updated.unitStatusConfig),
      hubspotConfig: normalizeHubspotConfig(updated.hubspotConfig),
      wordpressConfig: normalizeWordpressConfig(updated.wordpressConfig),
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
