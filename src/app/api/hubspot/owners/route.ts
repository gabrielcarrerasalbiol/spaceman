import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Resolve active settings row to avoid reading stale/non-default entries.
    const settings = await getOrCreateSettingsRow();

    const hubspotConfig = (settings as any).hubspotConfig || {};
    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured' },
        { status: 400 }
      );
    }

    const apiKey = hubspotConfig.apiKey;

    // Fetch all owners from HubSpot
    const allOwners: any[] = [];
    let after: string | undefined;

    do {
      const url = new URL('https://api.hubapi.com/crm/v3/owners');
      url.searchParams.append('limit', '500');
      url.searchParams.append('archived', 'false');
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
        return NextResponse.json(
          { error: `HubSpot API error: ${body.slice(0, 200)}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      allOwners.push(...(data.results || []));

      after = data.paging?.next?.after;
    } while (after);

    // Get existing users with HubSpot owner IDs to prevent duplicates
    const existingUsers = await prisma.users.findMany({
      where: {
        hubspotOwnerId: { not: null },
      },
      select: {
        hubspotOwnerId: true,
        email: true,
      },
    });

    const importedOwnerIds = new Set(
      existingUsers.map((u) => u.hubspotOwnerId).filter(Boolean)
    );
    const importedEmails = new Set(existingUsers.map((u) => u.email));

    // Format owners and mark which ones are already imported
    const formattedOwners = allOwners.map((owner) => {
      const ownerId = String(owner?.id || '').trim();
      const email = String(owner?.email || '').trim();
      const firstName = String(owner?.firstName || '').trim();
      const lastName = String(owner?.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        id: ownerId,
        email,
        firstName,
        lastName,
        fullName: fullName || email || ownerId,
        userId: String(owner?.userId || '').trim(),
        imported: importedOwnerIds.has(ownerId) || importedEmails.has(email),
      };
    });

    // Sort by imported status (not imported first) and then by name
    formattedOwners.sort((a, b) => {
      if (a.imported !== b.imported) {
        return a.imported ? 1 : -1;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({
      owners: formattedOwners,
      total: formattedOwners.length,
      importedCount: formattedOwners.filter((o) => o.imported).length,
      availableCount: formattedOwners.filter((o) => !o.imported).length,
    });
  } catch (error) {
    console.error('Error fetching HubSpot owners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HubSpot owners' },
      { status: 500 }
    );
  }
}

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
    const { ownerIds } = body;

    if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
      return NextResponse.json(
        { error: 'ownerIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Resolve active settings row to avoid reading stale/non-default entries.
    const settings = await getOrCreateSettingsRow();

    const hubspotConfig = (settings as any).hubspotConfig || {};
    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured' },
        { status: 400 }
      );
    }

    const apiKey = hubspotConfig.apiKey;

    // Get existing users to prevent duplicates
    const existingUsers = await prisma.users.findMany({
      select: {
        email: true,
        hubspotOwnerId: true,
      },
    });

    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const existingOwnerIds = new Set(
      existingUsers.map((u) => u.hubspotOwnerId).filter(Boolean)
    );

    // Fetch details for selected owners
    const results = {
      success: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const ownerId of ownerIds) {
      try {
        // Skip if already imported
        if (existingOwnerIds.has(ownerId)) {
          results.skipped++;
          results.details.push({
            ownerId,
            status: 'skipped',
            reason: 'Already imported',
          });
          continue;
        }

        // Fetch owner details from HubSpot
        let ownerData = null;
        for (const idProperty of ['id', 'userId']) {
          const url = new URL(`https://api.hubapi.com/crm/v3/owners/${ownerId}`);
          url.searchParams.append('idProperty', idProperty);
          url.searchParams.append('archived', 'false');

          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            ownerData = await response.json();
            break;
          }
        }

        if (!ownerData) {
          results.errors++;
          results.details.push({
            ownerId,
            status: 'error',
            reason: 'Failed to fetch owner details',
          });
          continue;
        }

        const email = String(ownerData?.email || '').trim();
        const firstName = String(ownerData?.firstName || '').trim();
        const lastName = String(ownerData?.lastName || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();

        // Skip if email already exists
        if (existingEmails.has(email)) {
          results.skipped++;
          results.details.push({
            ownerId,
            email,
            status: 'skipped',
            reason: 'Email already exists',
          });
          continue;
        }

        // Generate a random password (user will need to reset)
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        // Create user
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        await prisma.users.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            hubspotOwnerId: ownerId,
            active: true,
            banned: false,
          },
        });

        results.success++;
        results.details.push({
          ownerId,
          email,
          name: fullName,
          status: 'success',
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          ownerId,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.success} owners, skipped ${results.skipped}, ${results.errors} errors`,
      results,
    });
  } catch (error) {
    console.error('Error importing HubSpot owners:', error);
    return NextResponse.json(
      { error: 'Failed to import HubSpot owners' },
      { status: 500 }
    );
  }
}
