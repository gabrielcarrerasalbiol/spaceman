import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { logAudit, extractRequestInfo } from '@/lib/audit-logger';
import { serializeForJson } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        units: true,
        contracts: {
          include: {
            client: true,
            unit: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    return NextResponse.json(serializeForJson(location));
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { name, code, addressLine1, addressLine2, townCity, county, postcode, email, phone, openingHours, latitude, longitude, active } = body;

    const data: any = {
      updatedById: BigInt(user.id),
    };

    if (name !== undefined) {
      data.name = name;
      data.slug = String(name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (code !== undefined) data.code = code || null;
    if (addressLine1 !== undefined) data.addressLine1 = addressLine1 || null;
    if (addressLine2 !== undefined) data.addressLine2 = addressLine2 || null;
    if (townCity !== undefined) data.townCity = townCity || null;
    if (county !== undefined) data.county = county || null;
    if (postcode !== undefined) data.postcode = postcode || null;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (openingHours !== undefined) data.openingHours = openingHours || null;
    if (latitude !== undefined) data.latitude = latitude === '' || latitude === null ? null : Number(latitude);
    if (longitude !== undefined) data.longitude = longitude === '' || longitude === null ? null : Number(longitude);
    if (active !== undefined) data.active = Boolean(active);

    const location = await prisma.location.update({ where: { id }, data });

    // Log the update action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'UPDATE',
      entityType: 'LOCATION',
      entityId: location.id,
      description: `Updated location: ${location.name}`,
      metadata: {
        name: location.name,
        code: location.code,
        townCity: location.townCity,
        active: location.active,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(serializeForJson(location));
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const unitCount = await prisma.unit.count({ where: { locationId: id } });
    if (unitCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location with units attached' },
        { status: 400 }
      );
    }

    // Get location details before deletion for logging
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    await prisma.location.delete({ where: { id } });

    // Log the delete action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'DELETE',
      entityType: 'LOCATION',
      entityId: id,
      description: `Deleted location: ${location.name}`,
      metadata: {
        name: location.name,
        code: location.code,
        townCity: location.townCity,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
