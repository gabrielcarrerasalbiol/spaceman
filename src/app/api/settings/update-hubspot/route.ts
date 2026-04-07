import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

async function getOrCreateSettingsRow() {
  const byDefaultId = await prisma.settings.findUnique({
    where: { id: 'default' },
  });
  if (byDefaultId) return byDefaultId;

  const existing = await prisma.settings.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  if (existing) return existing;

  return prisma.settings.create({
    data: {
      id: 'default',
    },
  });
}

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

    // Resolve the active settings row (legacy installs may not use id="default").
    const settings = await getOrCreateSettingsRow();

    const currentConfig = (settings.hubspotConfig as any) || {};

    // Update HubSpot configuration
    const hubspotConfig = {
      ...currentConfig,
      apiKey,
      portalId,
      enabled: enabled ?? true,
    };

    await prisma.settings.update({
      where: { id: settings.id },
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
