import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { DEFAULT_STATUS_CONFIG, normalizeStatusConfig } from '@/lib/status-config';

const SETTINGS_SINGLETON_ID = 'default';

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

async function getOrCreateSettings() {
  const byDefaultId = await prisma.settings.findUnique({
    where: { id: SETTINGS_SINGLETON_ID },
    select: {
      id: true,
      siteName: true,
      siteLogo: true,
      siteDescription: true,
      primaryColor: true,
      unitStatusConfig: true,
      wordpressConfig: true,
    },
  });
  if (byDefaultId) return byDefaultId;

  const existing = await prisma.settings.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      siteName: true,
      siteLogo: true,
      siteDescription: true,
      primaryColor: true,
      unitStatusConfig: true,
      wordpressConfig: true,
    },
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
      wordpressConfig: normalizeWordpressConfig(null),
    },
    select: {
      id: true,
      siteName: true,
      siteLogo: true,
      siteDescription: true,
      primaryColor: true,
      unitStatusConfig: true,
      wordpressConfig: true,
    },
  });
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
    const { siteName, siteLogo, siteDescription, primaryColor, unitStatusConfig, wordpressConfig } = body;

    const settings = await getOrCreateSettings();

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        ...(siteName !== undefined && { siteName }),
        ...(siteLogo !== undefined && { siteLogo }),
        ...(siteDescription !== undefined && { siteDescription }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(unitStatusConfig !== undefined && { unitStatusConfig: normalizeStatusConfig(unitStatusConfig) }),
        ...(wordpressConfig !== undefined && { wordpressConfig: normalizeWordpressConfig(wordpressConfig) }),
      },
      select: {
        id: true,
        siteName: true,
        siteLogo: true,
        siteDescription: true,
        primaryColor: true,
        unitStatusConfig: true,
        wordpressConfig: true,
      },
    });

    return NextResponse.json({
      siteName: updated.siteName,
      siteLogo: updated.siteLogo || null,
      siteDescription: updated.siteDescription || null,
      primaryColor: updated.primaryColor,
      unitStatusConfig: normalizeStatusConfig(updated.unitStatusConfig),
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
