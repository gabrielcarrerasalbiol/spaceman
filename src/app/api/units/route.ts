import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { serializeForJson } from '@/lib/utils';
import { buildGeneratedUnitCode } from '@/lib/unit-display';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const locationId = searchParams.get('locationId') || '';
    const pageParam = Number(searchParams.get('page') || '');
    const limitParam = Number(searchParams.get('limit') || '');

    const isPaginatedRequest = Number.isFinite(pageParam) && pageParam > 0 && Number.isFinite(limitParam) && limitParam > 0;
    const page = isPaginatedRequest ? Math.max(1, Math.floor(pageParam)) : 1;
    const limit = isPaginatedRequest ? Math.min(100, Math.floor(limitParam)) : 0;

    const where = {
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
              { type: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(locationId ? { locationId } : {}),
    };

    if (isPaginatedRequest) {
      const totalItems = await prisma.unit.count({ where });
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const safePage = Math.min(page, totalPages);
      const skip = (safePage - 1) * limit;

      const units = await prisma.unit.findMany({
        where,
        include: {
          location: true,
          _count: { select: { contracts: true } },
        },
        orderBy: [{ location: { name: 'asc' } }, { code: 'asc' }],
        skip,
        take: limit,
      });

      return NextResponse.json(
        serializeForJson({
          items: units,
          pagination: {
            page: safePage,
            limit,
            totalItems,
            totalPages,
          },
        })
      );
    }

    const units = await prisma.unit.findMany({
      where,
      include: {
        location: true,
        _count: { select: { contracts: true } },
      },
      orderBy: [{ location: { name: 'asc' } }, { code: 'asc' }],
    });

    return NextResponse.json(serializeForJson(units));
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const {
      locationId,
      code,
      unitNumber,
      name,
      type,
      sizeSqft,
      dimensions,
      weeklyRate,
      monthlyRate,
      salePrice,
      offer,
      is24hDriveUp,
      isIndoor,
      status,
      description,
    } = body;

    if (!locationId) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    const normalizedSizeSqft = sizeSqft ? Number(sizeSqft) : null;
    const normalizedUnitNumber = unitNumber !== undefined && unitNumber !== '' ? Number(unitNumber) : null;
    const normalizedCode = code || buildGeneratedUnitCode(normalizedSizeSqft, normalizedUnitNumber);

    if (!normalizedCode) {
      return NextResponse.json({ error: 'Code or size and unit number are required' }, { status: 400 });
    }

    const unit = await prisma.unit.create({
      data: {
        locationId,
        code: normalizedCode,
        unitNumber: normalizedUnitNumber,
        name: name || normalizedCode,
        type: type || null,
        sizeSqft: normalizedSizeSqft,
        dimensions: dimensions || null,
        weeklyRate: weeklyRate !== undefined && weeklyRate !== '' ? Number(weeklyRate) : null,
        monthlyRate: monthlyRate !== undefined && monthlyRate !== '' ? Number(monthlyRate) : null,
        salePrice: salePrice !== undefined && salePrice !== '' ? Number(salePrice) : null,
        offer: offer || null,
        is24hDriveUp: Boolean(is24hDriveUp),
        isIndoor: Boolean(isIndoor),
        status: status || 'AVAILABLE',
        description: description || null,
        createdById: BigInt(user.id),
        updatedById: BigInt(user.id),
      },
      include: { location: true },
    });

    return NextResponse.json(serializeForJson(unit), { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 });
  }
}
