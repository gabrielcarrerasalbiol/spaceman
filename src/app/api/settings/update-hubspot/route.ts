import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { apiKey, portalId, enabled } = await request.json();

    if (!apiKey || !portalId) {
      return NextResponse.json(
        { error: 'API key and Portal ID are required' },
        { status: 400 }
      );
    }

    // Get current settings
    const settings = await prisma.settings.findFirst({
      where: { id: 'default' },
    });

    const currentConfig = (settings?.hubspotConfig as any) || {};

    // Update HubSpot configuration
    const hubspotConfig = {
      ...currentConfig,
      apiKey,
      portalId,
      enabled: enabled ?? true,
    };

    await prisma.settings.update({
      where: { id: 'default' },
      data: {
        hubspotConfig: hubspotConfig as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'HubSpot configuration updated successfully',
      config: {
        apiKey: '***REDACTED***',
        portalId,
        enabled: enabled ?? true,
      },
    });
  } catch (error) {
    console.error('Error updating HubSpot settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to update HubSpot configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
