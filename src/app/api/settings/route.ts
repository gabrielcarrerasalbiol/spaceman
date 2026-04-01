import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';

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
        },
      });
    }

    return NextResponse.json({
      siteName: settings.siteName,
      siteLogo: settings.siteLogo,
      siteDescription: settings.siteDescription,
      primaryColor: settings.primaryColor,
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
    const { siteName, siteLogo, siteDescription, primaryColor } = body;

    let settings = await prisma.settings.findFirst();

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...(siteName !== undefined && { siteName }),
          ...(siteLogo !== undefined && { siteLogo }),
          ...(siteDescription !== undefined && { siteDescription }),
          ...(primaryColor !== undefined && { primaryColor }),
        },
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          siteName: siteName || 'Skeleton',
          siteLogo: siteLogo || null,
          siteDescription: siteDescription || null,
          primaryColor: primaryColor || '#3b82f6',
        },
      });
    }

    return NextResponse.json({
      siteName: settings.siteName,
      siteLogo: settings.siteLogo,
      siteDescription: settings.siteDescription,
      primaryColor: settings.primaryColor,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
