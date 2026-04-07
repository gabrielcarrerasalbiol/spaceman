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

async function fetchOwnerLabels(apiKey: string): Promise<{ labelsById: Record<string, string>; errors: string[] }> {
  const labelsById: Record<string, string> = {};
  const errors: string[] = [];

  async function fetchOwnerPageSet(archived: boolean): Promise<void> {
    let after: string | undefined;

    do {
      const url = new URL('https://api.hubapi.com/crm/v3/owners');
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
        const body = await response.text();
        errors.push(`owners list archived=${archived} status=${response.status} body=${body.slice(0, 200)}`);
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

        if (ownerId) labelsById[ownerId] = label;
        if (userId) labelsById[userId] = label;
        if (userIdIncludingInactive) labelsById[userIdIncludingInactive] = label;
      }

      after = data.paging?.next?.after;
    } while (after);
  }

  await fetchOwnerPageSet(false);
  await fetchOwnerPageSet(true);

  return { labelsById, errors };
}

async function fetchOwnerLabelById(apiKey: string, ownerIdOrUserId: string): Promise<{ label: string | null; errors: string[] }> {
  const normalized = String(ownerIdOrUserId || '').trim();
  if (!normalized) return { label: null, errors: [] };

  const errors: string[] = [];

  for (const idProperty of ['id', 'userId']) {
    for (const archived of ['false', 'true']) {
      const url = new URL(`https://api.hubapi.com/crm/v3/owners/${normalized}`);
      url.searchParams.append('idProperty', idProperty);
      url.searchParams.append('archived', archived);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        errors.push(`owner ${normalized} idProperty=${idProperty} archived=${archived} status=${response.status} body=${body.slice(0, 120)}`);
        continue;
      }

      const owner = await response.json();
      const firstName = String(owner?.firstName || '').trim();
      const lastName = String(owner?.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const email = String(owner?.email || '').trim();
      return { label: fullName || email || normalized, errors };
    }
  }

  return { label: null, errors };
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await getOrCreateSettingsRow();
    const hubspotConfig = ((settings as any).hubspotConfig as any) || {};

    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured or enabled' },
        { status: 400 }
      );
    }

    const apiKey = hubspotConfig.apiKey;
    const { labelsById, errors: listFetchErrors } = await fetchOwnerLabels(apiKey);

    const distinctOwnerRows = await (prisma as any).hubSpotDeal.findMany({
      where: { owner: { not: null } },
      select: { owner: true },
      distinct: ['owner'],
    });

    const ownerIds = distinctOwnerRows
      .map((row: any) => String(row.owner || '').trim())
      .filter((owner: string) => /^\d+$/.test(owner));

    let resolved = 0;
    let updated = 0;
    let directLookupResolved = 0;
    const lookupErrors: string[] = [];
    const unresolvedOwnerIds: string[] = [];

    for (const ownerId of ownerIds) {
      let label = labelsById[ownerId] || null;
      if (!label) {
        const lookup = await fetchOwnerLabelById(apiKey, ownerId);
        label = lookup.label;
        if (lookup.errors.length > 0) {
          lookupErrors.push(...lookup.errors);
        }
        if (label) {
          directLookupResolved += 1;
        }
      }

      if (!label || label === ownerId) {
        unresolvedOwnerIds.push(ownerId);
        continue;
      }

      resolved += 1;
      const result = await (prisma as any).hubSpotDeal.updateMany({
        where: { owner: ownerId },
        data: {
          owner: label,
          lastSyncedAt: new Date(),
        },
      });

      updated += result.count;
    }

    return NextResponse.json({
      success: true,
      message: `Owner refresh complete. Resolved ${resolved} owner IDs and updated ${updated} deals.`,
      resolvedOwners: resolved,
      updatedDeals: updated,
      checkedOwnerIds: ownerIds.length,
      directLookupResolved,
      unresolvedOwnerIds: unresolvedOwnerIds.slice(0, 25),
      ownerLabelMapCount: Object.keys(labelsById).length,
      listFetchErrorCount: listFetchErrors.length,
      listFetchErrors: listFetchErrors.slice(0, 5),
      lookupErrorCount: lookupErrors.length,
      lookupErrors: lookupErrors.slice(0, 5),
    });
  } catch (error) {
    console.error('Error refreshing HubSpot owner labels:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh owner labels',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
