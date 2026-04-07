import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type DealPipelineMetadata = {
  pipelineLabelById: Record<string, string>;
  stageLabelById: Record<string, string>;
};

const UPSERT_BATCH_SIZE = 20;

async function fetchDealPipelineMetadata(apiKey: string): Promise<DealPipelineMetadata> {
  const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot pipelines API error: ${error}`);
  }

  const data = await response.json();
  const pipelines = data.results || [];

  const pipelineLabelById: Record<string, string> = {};
  const stageLabelById: Record<string, string> = {};

  for (const pipeline of pipelines) {
    const pipelineId = String(pipeline?.id || '').trim();
    const pipelineLabel = String(pipeline?.label || '').trim();
    if (pipelineId && pipelineLabel) {
      pipelineLabelById[pipelineId] = pipelineLabel;
    }

    const stages = pipeline?.stages || [];
    for (const stage of stages) {
      const stageId = String(stage?.id || '').trim();
      const stageLabel = String(stage?.label || '').trim();
      if (stageId && stageLabel) {
        stageLabelById[stageId] = stageLabel;
      }
    }
  }

  return { pipelineLabelById, stageLabelById };
}

async function fetchDealStagePropertyLabels(apiKey: string): Promise<Record<string, string>> {
  const response = await fetch('https://api.hubapi.com/crm/v3/properties/deals/dealstage', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {};
  }

  const data = await response.json();
  const options = data.options || [];
  const labelsByValue: Record<string, string> = {};

  for (const option of options) {
    const value = String(option?.value || '').trim();
    const label = String(option?.label || '').trim();
    if (value && label) {
      labelsByValue[value] = label;
    }
  }

  return labelsByValue;
}

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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function upsertDealsInBatches(
  deals: any[],
  stageLabelById: Record<string, string>,
  stageLabelByPropertyValue: Record<string, string>,
  pipelineLabelById: Record<string, string>
): Promise<void> {
  const dealChunks = chunkArray(deals, UPSERT_BATCH_SIZE);

  for (const chunk of dealChunks) {
    const operations = chunk.map((deal: any) => {
      const properties = deal.properties;
      const stageId = properties.dealstage || '';
      const pipelineId = properties.pipeline || '';
      const dealData = {
        dealName: properties.dealname || '',
        amount: properties.amount ? parseFloat(properties.amount) : null,
        dealStage: stageLabelById[stageId] || stageLabelByPropertyValue[stageId] || stageId,
        pipeline: pipelineLabelById[pipelineId] || pipelineId,
        closeDate: properties.closedate ? new Date(properties.closedate) : null,
        owner: properties.hubspot_owner_id || null,
        // Unit details from HubSpot custom properties
        unitNumber: properties.unit_number || null,
        unitType: properties.unit_type || null,
        unitSize: properties.unit_size || null,
        locationName: properties.location_name || null,
        startDate: properties.start_date ? new Date(properties.start_date) : null,
        endDate: properties.end_date ? new Date(properties.end_date) : null,
        weeklyRate: properties.weekly_rate ? parseFloat(properties.weekly_rate) : null,
        monthlyRate: properties.monthly_rate ? parseFloat(properties.monthly_rate) : null,
        rawData: deal,
        lastSyncedAt: new Date(),
      };

      return prisma.hubSpotDeal.upsert({
        where: { id: deal.id },
        update: dealData,
        create: {
          id: deal.id,
          ...dealData,
        },
      });
    });

    await Promise.all(operations);
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve the active settings row (legacy installs may not use id="default").
    const settings = await getOrCreateSettingsRow();

    const hubspotConfig = (settings.hubspotConfig as any) || {};

    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured' },
        { status: 400 }
      );
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const skip = (page - 1) * limit;

    // Parse filter params
    const dealName = searchParams.get('dealName');
    const amountMin = searchParams.get('amountMin');
    const amountMax = searchParams.get('amountMax');
    const dealStage = searchParams.get('dealStage');
    const pipeline = searchParams.get('pipeline');
    const closeDateFrom = searchParams.get('closeDateFrom');
    const closeDateTo = searchParams.get('closeDateTo');
    const owner = searchParams.get('owner');

    // Build where clause for filters
    const where: any = {};

    if (dealName) {
      where.dealName = { contains: dealName, mode: 'insensitive' };
    }

    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) where.amount.gte = parseFloat(amountMin);
      if (amountMax) where.amount.lte = parseFloat(amountMax);
    }

    if (dealStage) {
      where.dealStage = dealStage;
    }

    if (pipeline) {
      where.pipeline = pipeline;
    }

    if (closeDateFrom || closeDateTo) {
      where.closeDate = {};
      if (closeDateFrom) where.closeDate.gte = new Date(closeDateFrom);
      if (closeDateTo) where.closeDate.lte = new Date(closeDateTo);
    }

    if (owner) {
      where.owner = { contains: owner, mode: 'insensitive' };
    }

    // Get total count (with filters)
    const total = await prisma.hubSpotDeal.count({ where });

    // Get paginated deals from database (with filters)
    const deals = await prisma.hubSpotDeal.findMany({
      where,
      orderBy: [{ closeDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      deals,
      lastSyncedAt: hubspotConfig.lastSync,
      count: deals.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

    // Resolve the active settings row (legacy installs may not use id="default").
    const settings = await getOrCreateSettingsRow();

    const hubspotConfig = (settings.hubspotConfig as any) || {};

    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured or enabled' },
        { status: 400 }
      );
    }

    const apiKey = hubspotConfig.apiKey;

    let after: string | undefined = undefined;
    let totalProcessed = 0;

    let pipelineLabelById: Record<string, string> = {};
    let stageLabelById: Record<string, string> = {};
    let stageLabelByPropertyValue: Record<string, string> = {};

    try {
      const metadata = await fetchDealPipelineMetadata(apiKey);
      pipelineLabelById = metadata.pipelineLabelById;
      stageLabelById = metadata.stageLabelById;
    } catch (metadataError) {
      console.error('Unable to resolve pipeline/stage labels from HubSpot:', metadataError);
      // Keep syncing and fall back to raw IDs.
    }

    try {
      stageLabelByPropertyValue = await fetchDealStagePropertyLabels(apiKey);
    } catch (metadataError) {
      console.error('Unable to resolve dealstage property labels from HubSpot:', metadataError);
      // Keep syncing and fall back to raw IDs.
    }

    // Fetch all deals with pagination
    do {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/deals');
      // HubSpot limits to 50 when using propertiesWithHistory
      url.searchParams.append('limit', '50');
      // Fetch associations for companies and contacts
      url.searchParams.append('properties', 'dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id,unit_number,unit_type,unit_size,location_name,start_date,end_date,weekly_rate,monthly_rate');
      url.searchParams.append('associations', 'companies,contacts');
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
      const pageDeals = data.results || [];
      await upsertDealsInBatches(pageDeals, stageLabelById, stageLabelByPropertyValue, pipelineLabelById);
      after = data.paging?.next?.after;
      totalProcessed += pageDeals.length;

    } while (after);

    // Update last sync time in settings
    await prisma.settings.update({
      where: { id: settings.id },
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
      totalDeals: totalProcessed,
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
