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

async function fetchDealOwnerLabels(apiKey: string): Promise<Record<string, string>> {
  const ownerLabelById: Record<string, string> = {};

  async function fetchOwnerPageSet(archived: boolean): Promise<void> {
    let after: string | undefined;

    do {
      const url = new URL('https://api.hubapi.com/crm/v3/owners/');
      url.searchParams.append('limit', '500');
      url.searchParams.append('archived', String(archived));
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
        return;
      }

      const data = await response.json();
      const owners = data.results || [];

      for (const owner of owners) {
        const ownerId = String(owner?.id || '').trim();
        const userId = String(owner?.userId || '').trim();
        const userIdIncludingInactive = String(owner?.userIdIncludingInactive || '').trim();

        const firstName = String(owner?.firstName || '').trim();
        const lastName = String(owner?.lastName || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = String(owner?.email || '').trim();
        const label = fullName || email || ownerId || userId || userIdIncludingInactive;
        if (!label) continue;

        if (ownerId) ownerLabelById[ownerId] = label;
        if (userId) ownerLabelById[userId] = label;
        if (userIdIncludingInactive) ownerLabelById[userIdIncludingInactive] = label;
      }

      after = data.paging?.next?.after;
    } while (after);
  }

  await fetchOwnerPageSet(false);
  await fetchOwnerPageSet(true);

  return ownerLabelById;
}

async function fetchOwnerLabelByAnyId(apiKey: string, ownerIdOrUserId: string): Promise<string | null> {
  const normalized = String(ownerIdOrUserId || '').trim();
  if (!normalized) return null;

  const idPropertyCandidates = ['id', 'userId'];

  for (const idProperty of idPropertyCandidates) {
    const url = new URL(`https://api.hubapi.com/crm/v3/owners/${normalized}`);
    url.searchParams.append('idProperty', idProperty);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      continue;
    }

    const owner = await response.json();
    const firstName = String(owner?.firstName || '').trim();
    const lastName = String(owner?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const email = String(owner?.email || '').trim();
    const label = fullName || email || normalized;

    if (label) {
      return label;
    }
  }

  return null;
}

async function resolveMissingOwnerLabels(
  apiKey: string,
  ownerIds: string[],
  ownerLabelById: Record<string, string>
): Promise<Record<string, string>> {
  const resolved = { ...ownerLabelById };

  for (const ownerId of ownerIds) {
    const normalized = String(ownerId || '').trim();
    if (!normalized || resolved[normalized]) continue;

    try {
      const label = await fetchOwnerLabelByAnyId(apiKey, normalized);
      if (label) {
        resolved[normalized] = label;
      }
    } catch {
      // Ignore lookup failures and keep fallback behavior.
    }
  }

  return resolved;
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
  pipelineLabelById: Record<string, string>,
  ownerLabelById: Record<string, string>
): Promise<void> {
  const dealChunks = chunkArray(deals, UPSERT_BATCH_SIZE);

  for (const chunk of dealChunks) {
    const chunkIds = chunk.map((deal: any) => deal.id);
    const existingDeals = await prisma.hubSpotDeal.findMany({
      where: {
        id: {
          in: chunkIds,
        },
      },
      select: {
        id: true,
        dealStage: true,
      },
    });

    const existingById = new Map(existingDeals.map((deal) => [deal.id, deal]));

    const createOperations: Array<Promise<any>> = [];
    const updateStageOperations: Array<Promise<any>> = [];

    for (const deal of chunk) {
      const properties = deal.properties;
      const stageId = properties.dealstage || '';
      const pipelineId = properties.pipeline || '';
      const ownerId = String(properties.hubspot_owner_id || '').trim();
      const resolvedStage = stageLabelById[stageId] || stageLabelByPropertyValue[stageId] || stageId;

      const existing = existingById.get(deal.id);

      // Existing deals keep their existing data; only stage is refreshed.
      if (existing) {
        if (existing.dealStage !== resolvedStage) {
          updateStageOperations.push(
            prisma.hubSpotDeal.update({
              where: { id: deal.id },
              data: {
                dealStage: resolvedStage,
                lastSyncedAt: new Date(),
              },
            })
          );
        }

        continue;
      }

      const dealData = {
        dealName: properties.dealname || '',
        amount: properties.amount ? parseFloat(properties.amount) : null,
        dealStage: resolvedStage,
        pipeline: pipelineLabelById[pipelineId] || pipelineId,
        closeDate: properties.closedate ? new Date(properties.closedate) : null,
        owner: ownerLabelById[ownerId] || ownerId || null,
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
    }

    if (createOperations.length > 0) {
      await Promise.all(createOperations);
    }

    if (updateStageOperations.length > 0) {
      await Promise.all(updateStageOperations);
    }
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

    // Fallback for legacy rows that still store owner IDs: resolve labels at read time.
    const unresolvedOwnerIds = Array.from(
      new Set(
        deals
          .map((deal) => String(deal.owner || '').trim())
          .filter((ownerValue) => /^\d+$/.test(ownerValue))
      )
    );

    if (unresolvedOwnerIds.length > 0) {
      try {
        let ownerLabelById = await fetchDealOwnerLabels(hubspotConfig.apiKey);
        ownerLabelById = await resolveMissingOwnerLabels(
          hubspotConfig.apiKey,
          unresolvedOwnerIds,
          ownerLabelById
        );

        for (const deal of deals) {
          const ownerValue = String(deal.owner || '').trim();
          if (ownerValue && ownerLabelById[ownerValue]) {
            (deal as any).owner = ownerLabelById[ownerValue];
          }
        }

        // Persist resolved labels so IDs don't reappear on next page load.
        const updates = deals
          .filter((deal) => {
            const ownerValue = String(deal.owner || '').trim();
            return !!ownerValue && !!ownerLabelById[ownerValue] && ownerLabelById[ownerValue] !== ownerValue;
          })
          .map((deal) =>
            prisma.hubSpotDeal.update({
              where: { id: deal.id },
              data: { owner: ownerLabelById[String(deal.owner || '').trim()] },
            })
          );

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      } catch {
        // Non-blocking: keep numeric owner values if lookup fails.
      }
    }

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
    const body = await request.json().catch(() => ({} as any));
    const initialAfter = typeof body?.after === 'string' && body.after.length > 0
      ? body.after
      : undefined;
    const maxPages = Math.min(Math.max(Number(body?.maxPages) || 2, 1), 10);

    let after: string | undefined = initialAfter;
    let totalProcessed = 0;
    let pagesProcessed = 0;

    let pipelineLabelById: Record<string, string> = {};
    let stageLabelById: Record<string, string> = {};
    let stageLabelByPropertyValue: Record<string, string> = {};
    let ownerLabelById: Record<string, string> = {};

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

    try {
      ownerLabelById = await fetchDealOwnerLabels(apiKey);
    } catch (metadataError) {
      console.error('Unable to resolve owner labels from HubSpot:', metadataError);
      // Keep syncing and fall back to raw IDs.
    }

    // Fetch a bounded number of pages to keep request runtime short.
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
      const pageDeals: any[] = data.results || [];

      const unresolvedOwnerIds: string[] = Array.from(
        new Set<string>(
          pageDeals
            .map((deal: any) => String(deal?.properties?.hubspot_owner_id || '').trim())
            .filter((ownerId: string) => ownerId.length > 0 && !ownerLabelById[ownerId])
        )
      );

      if (unresolvedOwnerIds.length > 0) {
        ownerLabelById = await resolveMissingOwnerLabels(apiKey, unresolvedOwnerIds, ownerLabelById);
      }

      await upsertDealsInBatches(
        pageDeals,
        stageLabelById,
        stageLabelByPropertyValue,
        pipelineLabelById,
        ownerLabelById
      );
      after = data.paging?.next?.after;
      totalProcessed += pageDeals.length;
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

    return NextResponse.json({
      success: true,
      message: hasMore ? 'Processed sync batch' : 'Successfully synced HubSpot deals',
      processedThisRun: totalProcessed,
      totalProcessed,
      totalDeals: totalProcessed,
      pagesProcessed,
      hasMore,
      nextAfter: after || null,
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
