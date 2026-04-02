import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { DEFAULT_STATUS_CONFIG, normalizeStatusConfig } from '@/lib/status-config';

const SETTINGS_SINGLETON_ID = 'default';

async function getOrCreateSettings() {
  const byDefaultId = await prisma.settings.findUnique({ where: { id: SETTINGS_SINGLETON_ID } });
  if (byDefaultId) return byDefaultId;

  const existing = await prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (existing) return existing;

  return prisma.settings.create({
    data: {
      id: SETTINGS_SINGLETON_ID,
      siteName: 'Skeleton',
      siteLogo: null,
      siteDescription: null,
      primaryColor: '#3b82f6',
      unitStatusConfig: DEFAULT_STATUS_CONFIG,
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
    const { siteName, siteLogo, siteDescription, primaryColor, unitStatusConfig } = body;

    const settings = await getOrCreateSettings();

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        ...(siteName !== undefined && { siteName }),
        ...(siteLogo !== undefined && { siteLogo }),
        ...(siteDescription !== undefined && { siteDescription }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(unitStatusConfig !== undefined && { unitStatusConfig: normalizeStatusConfig(unitStatusConfig) }),
      },
    });

    return NextResponse.json({
      siteName: updated.siteName,
      siteLogo: updated.siteLogo || null,
      siteDescription: updated.siteDescription || null,
      primaryColor: updated.primaryColor,
      unitStatusConfig: normalizeStatusConfig(updated.unitStatusConfig),
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
