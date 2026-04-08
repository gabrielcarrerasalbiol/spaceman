import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { logAudit, extractRequestInfo } from '@/lib/audit-logger';
import { serializeForJson } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const locations = await prisma.location.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { townCity: { contains: search, mode: 'insensitive' } },
              { postcode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        _count: { select: { units: true, contracts: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(serializeForJson(locations));
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, code, addressLine1, addressLine2, townCity, county, postcode, email, phone, openingHours, latitude, longitude } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const location = await prisma.location.create({
      data: {
        name,
        slug,
        code: code || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        townCity: townCity || null,
        county: county || null,
        postcode: postcode || null,
        email: email || null,
        phone: phone || null,
        openingHours: openingHours || null,
        latitude: latitude !== undefined && latitude !== '' ? Number(latitude) : null,
        longitude: longitude !== undefined && longitude !== '' ? Number(longitude) : null,
        createdById: BigInt(user.id),
        updatedById: BigInt(user.id),
      },
    });

    // Log the action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'CREATE',
      entityType: 'LOCATION',
      entityId: location.id,
      description: `Created location: ${name}`,
      metadata: {
        name,
        code,
        townCity,
        postcode,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(serializeForJson(location), { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
