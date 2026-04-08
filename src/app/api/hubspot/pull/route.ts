import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { logAudit, extractRequestInfo } from '@/lib/audit-logger';

type DealPipelineMetadata = {
  pipelineLabelById: Record<string, string>;
  stageLabelById: Record<string, string>;
};

const UPSERT_BATCH_SIZE = 20;
const MIN_NEW_DEAL_AMOUNT_TO_IMPORT = 1;

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
  existingById: Map<string, { id: string; dealStage: string }>,
  stageLabelById: Record<string, string>,
  stageLabelByPropertyValue: Record<string, string>,
  pipelineLabelById: Record<string, string>
): Promise<{ created: number; stageUpdated: number; skippedLowValue: number }> {
  const dealChunks = chunkArray(deals, UPSERT_BATCH_SIZE);
  let created = 0;
  let stageUpdated = 0;
  let skippedLowValue = 0;

  for (const chunk of dealChunks) {
    const createOperations: Array<Promise<any>> = [];
    const updateStageOperations: Array<Promise<any>> = [];

    for (const deal of chunk) {
      const properties = deal.properties;
      const stageId = properties.dealstage || '';
      const pipelineId = properties.pipeline || '';
      const resolvedStage = stageLabelById[stageId] || stageLabelByPropertyValue[stageId] || stageId;

      const existing = existingById.get(deal.id);

      // Existing deals refresh stage only without doing full data updates.
      if (existing) {
        const nextData: { dealStage?: string; lastSyncedAt: Date } = {
          lastSyncedAt: new Date(),
        };

        let shouldUpdate = false;

        if (existing.dealStage !== resolvedStage) {
          nextData.dealStage = resolvedStage;
          shouldUpdate = true;
          stageUpdated += 1;
        }

        if (shouldUpdate) {
          updateStageOperations.push(
            prisma.hubSpotDeal.update({
              where: { id: deal.id },
              data: nextData,
            })
          );
        }

        continue;
      }

      const amountValue = properties.amount !== undefined && properties.amount !== null && properties.amount !== ''
        ? parseFloat(properties.amount)
        : null;

      // Skip importing brand-new low-value deals (<= £1) to reduce noise and sync load.
      if (amountValue !== null && !Number.isNaN(amountValue) && amountValue <= MIN_NEW_DEAL_AMOUNT_TO_IMPORT) {
        skippedLowValue += 1;
        continue;
      }

      const dealData = {
        dealName: properties.dealname || '',
        amount: amountValue,
        dealStage: resolvedStage,
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

      createOperations.push(
        prisma.hubSpotDeal.create({
          data: {
            id: deal.id,
            ...dealData,
          },
        })
      );
      created += 1;
    }

    if (createOperations.length > 0) {
      await Promise.all(createOperations);
    }

    if (updateStageOperations.length > 0) {
      await Promise.all(updateStageOperations);
    }
  }

  return { created, stageUpdated, skippedLowValue };
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
  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    user = await getCurrentUser();
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
    const body = await request.json().catch(() => ({} as any));
    const initialAfter = typeof body?.after === 'string' && body.after.length > 0
      ? body.after
      : undefined;
    const maxPages = Math.min(Math.max(Number(body?.maxPages) || 2, 1), 10);

    let after: string | undefined = initialAfter;
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalStageUpdated = 0;
    let totalSkippedLowValue = 0;
    let totalScanned = 0;
    let pagesProcessed = 0;

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

    // Fetch a bounded number of pages to keep request runtime short.
    do {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/deals');
      // HubSpot limits to 50 when using propertiesWithHistory
      url.searchParams.append('limit', '50');
      // Keep sync payload small: no associations needed for stage-only refreshes.
      url.searchParams.append('properties', 'dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id,unit_number,unit_type,unit_size,location_name,start_date,end_date,weekly_rate,monthly_rate');
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
      const pageDeals: any[] = data.results || [];
      totalScanned += pageDeals.length;

      const pageDealIds = pageDeals.map((deal: any) => deal.id);
      const existingDealsForPage = await prisma.hubSpotDeal.findMany({
        where: {
          id: {
            in: pageDealIds,
          },
        },
        select: {
          id: true,
          dealStage: true,
          owner: true,
        },
      });
      const existingById = new Map(existingDealsForPage.map((deal) => [deal.id, deal]));

      const stats = await upsertDealsInBatches(
        pageDeals,
        existingById,
        stageLabelById,
        stageLabelByPropertyValue,
        pipelineLabelById
      );

      totalCreated += stats.created;
      totalStageUpdated += stats.stageUpdated;
      totalSkippedLowValue += stats.skippedLowValue;
      after = data.paging?.next?.after;
      totalProcessed += stats.created + stats.stageUpdated;
      pagesProcessed += 1;

    } while (after && pagesProcessed < maxPages);

    const hasMore = Boolean(after);

    // Only mark sync complete when no more pages remain.
    if (!hasMore) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          hubspotConfig: {
            ...hubspotConfig,
            lastSync: new Date().toISOString(),
          } as any,
        },
      });
    }

    // Log the sync action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'SYNC',
      entityType: 'HUBSPOT',
      description: 'Initiated HubSpot deal sync',
      metadata: {
        maxPages,
        pagesProcessed,
        totalScanned,
        createdThisRun: totalCreated,
        stageUpdatedThisRun: totalStageUpdated,
        hasMore,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: hasMore ? 'Processed sync batch' : 'Successfully synced HubSpot deals',
      processedThisRun: totalProcessed,
      totalProcessed,
      totalDeals: totalProcessed,
      scannedThisRun: totalScanned,
      createdThisRun: totalCreated,
      stageUpdatedThisRun: totalStageUpdated,
      skippedLowValueThisRun: totalSkippedLowValue,
      pagesProcessed,
      hasMore,
      nextAfter: after || null,
    });
  } catch (error) {
    console.error('Error syncing HubSpot deals:', error);

    // Log sync failure
    try {
      if (user) {
        const { ipAddress, userAgent } = extractRequestInfo(request);
        await logAudit(user.id, {
          action: 'SYNC',
          entityType: 'HUBSPOT',
          description: 'HubSpot sync failed',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          ipAddress,
          userAgent,
        });
      }
    } catch (logError) {
      // Ignore logging errors in error handler
    }

    return NextResponse.json(
      {
        error: 'Failed to sync HubSpot deals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
