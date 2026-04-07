import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get HubSpot configuration
    const settings = await prisma.settings.findFirst({
      where: { id: 'default' },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not configured' },
        { status: 404 }
      );
    }

    const hubspotConfig = (settings.hubspotConfig as any) || {};

    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured' },
        { status: 400 }
      );
    }

    // Get cached deals from database
    const deals = await prisma.hubSpotDeal.findMany({
      orderBy: [{ closeDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      deals,
      lastSyncedAt: hubspotConfig.lastSync,
      count: deals.length,
    });
  } catch (error) {
    console.error('Error fetching HubSpot deals:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch HubSpot deals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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

    // Get HubSpot configuration
    const settings = await prisma.settings.findFirst({
      where: { id: 'default' },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not configured' },
        { status: 404 }
      );
    }

    const hubspotConfig = (settings.hubspotConfig as any) || {};

    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured or enabled' },
        { status: 400 }
      );
    }

    const apiKey = hubspotConfig.apiKey;
    let allDeals: any[] = [];
    let after: string | undefined = undefined;
    let totalProcessed = 0;

    // Fetch all deals with pagination
    do {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/deals');
      url.searchParams.append('limit', '100');
      if (after) {
        url.searchParams.append('after', after);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HubSpot API error: ${error}`);
      }

      const data = await response.json();
      allDeals = [...allDeals, ...data.results];
      after = data.paging?.next?.after;
      totalProcessed += data.results?.length || 0;

    } while (after);

    // Upsert deals to database
    const updateOperations = allDeals.map((deal: any) => {
      const properties = deal.properties;
      return prisma.hubSpotDeal.upsert({
        where: { id: deal.id },
        update: {
          dealName: properties.dealname || '',
          amount: properties.amount ? parseFloat(properties.amount) : null,
          dealStage: properties.dealstage || '',
          pipeline: properties.pipeline || '',
          closeDate: properties.closedate ? new Date(properties.closedate) : null,
          owner: properties.hubspot_owner_id || null,
          rawData: deal,
          lastSyncedAt: new Date(),
        },
        create: {
          id: deal.id,
          dealName: properties.dealname || '',
          amount: properties.amount ? parseFloat(properties.amount) : null,
          dealStage: properties.dealstage || '',
          pipeline: properties.pipeline || '',
          closeDate: properties.closedate ? new Date(properties.closedate) : null,
          owner: properties.hubspot_owner_id || null,
          rawData: deal,
          lastSyncedAt: new Date(),
        },
      });
    });

    await Promise.all(updateOperations);

    // Update last sync time in settings
    await prisma.settings.update({
      where: { id: 'default' },
      data: {
        hubspotConfig: {
          ...hubspotConfig,
          lastSync: new Date().toISOString(),
        } as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully synced HubSpot deals',
      totalProcessed,
      totalDeals: allDeals.length,
    });
  } catch (error) {
    console.error('Error syncing HubSpot deals:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync HubSpot deals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
