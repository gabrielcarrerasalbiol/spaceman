import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { serializeForJson } from '@/lib/utils';
import { buildGeneratedUnitCode } from '@/lib/unit-display';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const sizeSqft = Number(body.sizeSqft);
    const quantity = Number(body.quantity);

    if (!Number.isInteger(sizeSqft) || sizeSqft <= 0) {
      return NextResponse.json({ error: 'Size must be a positive whole number' }, { status: 400 });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive whole number' }, { status: 400 });
    }

    const location = await prisma.location.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const existingUnits = await prisma.unit.findMany({
      where: { locationId: id, sizeSqft },
      select: {
        id: true,
        unitNumber: true,
        _count: {
          select: {
            contracts: true,
          },
        },
      },
      orderBy: [{ unitNumber: 'asc' }, { code: 'asc' }],
    });

    let removedCount = 0;
    if (existingUnits.length > quantity) {
      const unitsToRemove = existingUnits.length - quantity;
      const removableUnits = [...existingUnits]
        .filter((unit) => unit._count.contracts === 0)
        .sort((left, right) => (right.unitNumber ?? 0) - (left.unitNumber ?? 0));

      if (removableUnits.length < unitsToRemove) {
        return NextResponse.json(
          {
            error: `Cannot reduce to ${quantity}. ${unitsToRemove - removableUnits.length} unit(s) are linked to contracts and cannot be removed.`,
          },
          { status: 400 }
        );
      }

      const idsToDelete = removableUnits.slice(0, unitsToRemove).map((unit) => unit.id);
      await prisma.unit.deleteMany({ where: { id: { in: idsToDelete } } });
      removedCount = idsToDelete.length;
    }

    const refreshedUnits = await prisma.unit.findMany({
      where: { locationId: id, sizeSqft },
      select: { unitNumber: true },
    });

    const usedNumbers = new Set(refreshedUnits.map((unit) => unit.unitNumber).filter((value): value is number => value !== null));
    const unitsToCreate = [];
    for (let nextNumber = 1; refreshedUnits.length + unitsToCreate.length < quantity; nextNumber += 1) {
      if (usedNumbers.has(nextNumber)) continue;
      usedNumbers.add(nextNumber);

      const generatedCode = buildGeneratedUnitCode(sizeSqft, nextNumber);
      unitsToCreate.push({
        locationId: id,
        code: generatedCode,
        unitNumber: nextNumber,
        name: generatedCode,
        type: body.type || null,
        sizeSqft,
        dimensions: body.dimensions || null,
        weeklyRate: body.weeklyRate !== undefined && body.weeklyRate !== '' ? Number(body.weeklyRate) : null,
        monthlyRate: body.monthlyRate !== undefined && body.monthlyRate !== '' ? Number(body.monthlyRate) : null,
        salePrice: body.salePrice !== undefined && body.salePrice !== '' ? Number(body.salePrice) : null,
        offer: body.offer || null,
        is24hDriveUp: Boolean(body.is24hDriveUp),
        isIndoor: Boolean(body.isIndoor),
        status: 'AVAILABLE' as const,
        active: true,
        description: body.description || null,
        createdById: BigInt(user.id),
        updatedById: BigInt(user.id),
      });
    }

    if (unitsToCreate.length > 0) {
      await prisma.unit.createMany({ data: unitsToCreate });
    }

    const units = await prisma.unit.findMany({
      where: { locationId: id, sizeSqft },
      orderBy: [{ unitNumber: 'asc' }, { code: 'asc' }],
    });

    return NextResponse.json(
      serializeForJson({
        locationId: id,
        sizeSqft,
        requestedQuantity: quantity,
        createdCount: unitsToCreate.length,
        removedCount,
        units,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk creating units:', error);
    return NextResponse.json({ error: 'Failed to create units for this location' }, { status: 500 });
  }
}