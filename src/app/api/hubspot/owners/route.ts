import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { createRateLimitResponse, enforceDbRateLimit, getClientIp } from '@/lib/db-rate-limit';

function pickString(source: any, keys: string[]): string {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function parseNameFromEmail(email: string): { firstName: string; lastName: string } {
  const local = email.split('@')[0] || '';
  const tokens = local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 0) return { firstName: '', lastName: '' };

  const firstName = tokens[0] || '';
  const lastName = tokens.slice(1).join(' ');

  return {
    firstName: firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '',
    lastName: lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : '',
  };
}

function buildUsernameCandidate(email: string, firstName: string, lastName: string): string {
  const fromName = `${firstName}.${lastName}`.replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  const source = fromName || (email.split('@')[0] || 'user');
  return source.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 12);
}

async function fetchHubSpotUserProfile(apiKey: string, userId: string) {
  if (!userId) return null;

  const url = new URL(`https://api.hubapi.com/settings/v3/users/${encodeURIComponent(userId)}`);
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;
  return response.json();
}

async function fetchHubSpotContactByEmail(apiKey: string, email: string) {
  if (!email) return null;

  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      properties: ['phone', 'mobilephone', 'address', 'city', 'state', 'zip', 'country'],
      limit: 1,
    }),
  });

  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const first = payload?.results?.[0];
  return first?.properties || null;
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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rateLimit = await enforceDbRateLimit({
      scope: 'hubspot:owners:get',
      identifier: `${user.id}:${getClientIp(request)}`,
      windowMs: 60_000,
      max: 20,
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
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

    const rateLimit = await enforceDbRateLimit({
      scope: 'hubspot:owners:import',
      identifier: `${user.id}:${getClientIp(request)}`,
      windowMs: 60_000,
      max: 10,
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
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
        username: true,
      },
    });

    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const existingUsernames = new Set(existingUsers.map((u) => u.username).filter(Boolean));
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

        const userId = String(ownerData?.userId || '').trim();
        const hubspotUserProfile = await fetchHubSpotUserProfile(apiKey, userId);

        const email = pickString(ownerData, ['email']) || pickString(hubspotUserProfile, ['email', 'primaryEmail']);

        if (!email) {
          results.errors++;
          results.details.push({
            ownerId,
            status: 'error',
            reason: 'Owner has no email address',
          });
          continue;
        }

        let firstName =
          pickString(ownerData, ['firstName']) ||
          pickString(hubspotUserProfile, ['firstName', 'givenName']);
        let lastName =
          pickString(ownerData, ['lastName']) ||
          pickString(hubspotUserProfile, ['lastName', 'familyName']);

        if (!firstName && !lastName) {
          const parsed = parseNameFromEmail(email);
          firstName = parsed.firstName;
          lastName = parsed.lastName;
        }

        const hubspotContact = await fetchHubSpotContactByEmail(apiKey, email);

        const phone =
          pickString(hubspotUserProfile, ['phone', 'phoneNumber', 'primaryPhoneNumber']) ||
          pickString(hubspotContact, ['phone']) ||
          null;
        const mobile =
          pickString(hubspotUserProfile, ['mobilePhoneNumber', 'mobile']) ||
          pickString(hubspotContact, ['mobilephone']) ||
          null;
        const addressLine1 = pickString(hubspotContact, ['address']) || null;
        const townCity = pickString(hubspotContact, ['city']) || null;
        const county = pickString(hubspotContact, ['state']) || null;
        const postcode = pickString(hubspotContact, ['zip']) || null;
        const country = pickString(hubspotContact, ['country']) || null;
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

        let username: string | null = null;
        const usernameBase = buildUsernameCandidate(email, firstName, lastName);
        if (usernameBase) {
          if (!existingUsernames.has(usernameBase)) {
            username = usernameBase;
          } else {
            for (let i = 1; i < 100; i++) {
              const suffix = String(i);
              const candidate = `${usernameBase.slice(0, Math.max(1, 12 - suffix.length))}${suffix}`;
              if (!existingUsernames.has(candidate)) {
                username = candidate;
                break;
              }
            }
          }
        }

        // Generate a random password (user will need to reset)
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        await prisma.users.create({
          data: {
            email,
            username,
            password: hashedPassword,
            firstName: firstName || null,
            lastName: lastName || null,
            phone,
            mobile,
            addressLine1,
            townCity,
            county,
            postcode,
            country,
            hubspotOwnerId: ownerId,
            active: true,
            banned: false,
          },
        });

        existingEmails.add(email);
        if (username) {
          existingUsernames.add(username);
        }

        results.success++;
        results.details.push({
          ownerId,
          email,
          name: fullName,
          username,
          enrichment: {
            fromOwner: {
              hasFirstName: Boolean(ownerData?.firstName),
              hasLastName: Boolean(ownerData?.lastName),
            },
            fromUserProfile: {
              found: Boolean(hubspotUserProfile),
              hasPhone: Boolean(pickString(hubspotUserProfile, ['phone', 'phoneNumber', 'primaryPhoneNumber'])),
              hasMobile: Boolean(pickString(hubspotUserProfile, ['mobilePhoneNumber', 'mobile'])),
            },
            fromContact: {
              found: Boolean(hubspotContact),
              hasPhone: Boolean(pickString(hubspotContact, ['phone'])),
              hasMobile: Boolean(pickString(hubspotContact, ['mobilephone'])),
              hasAddress: Boolean(pickString(hubspotContact, ['address'])),
            },
          },
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
