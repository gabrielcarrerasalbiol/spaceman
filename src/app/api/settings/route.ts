import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { DEFAULT_STATUS_CONFIG, normalizeStatusConfig } from '@/lib/status-config';

// GET /api/settings - Get site settings
export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          siteName: 'Skeleton',
          siteLogo: null,
          siteDescription: null,
          primaryColor: '#3b82f6',
          unitStatusConfig: DEFAULT_STATUS_CONFIG,
        },
      });
    }

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

    let settings = await prisma.settings.findFirst();

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...(siteName !== undefined && { siteName }),
          ...(siteLogo !== undefined && { siteLogo }),
          ...(siteDescription !== undefined && { siteDescription }),
          ...(primaryColor !== undefined && { primaryColor }),
          ...(unitStatusConfig !== undefined && { unitStatusConfig: normalizeStatusConfig(unitStatusConfig) }),
        },
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          siteName: siteName || 'Skeleton',
          siteLogo: siteLogo || null,
          siteDescription: siteDescription || null,
          primaryColor: primaryColor || '#3b82f6',
          unitStatusConfig: normalizeStatusConfig(unitStatusConfig),
        },
      });
    }

    return NextResponse.json({
      siteName: settings.siteName,
      siteLogo: settings.siteLogo || null,
      siteDescription: settings.siteDescription || null,
      primaryColor: settings.primaryColor,
      unitStatusConfig: normalizeStatusConfig(settings.unitStatusConfig),
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
