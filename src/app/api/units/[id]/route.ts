import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { serializeForJson } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        location: true,
        contracts: {
          include: {
            client: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    return NextResponse.json(serializeForJson(unit));
  } catch (error) {
    console.error('Error fetching unit:', error);
    return NextResponse.json({ error: 'Failed to fetch unit' }, { status: 500 });
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

    const data: any = { updatedById: BigInt(user.id) };
    const numericFields = ['sizeSqft', 'weeklyRate', 'monthlyRate', 'salePrice'];
    const scalarFields = ['locationId', 'code', 'name', 'type', 'dimensions', 'offer', 'status', 'description'];

    for (const key of scalarFields) {
      if (body[key] !== undefined) data[key] = body[key] || null;
    }

    for (const key of numericFields) {
      if (body[key] !== undefined) {
        data[key] = body[key] === '' || body[key] === null ? null : Number(body[key]);
      }
    }

    if (body.is24hDriveUp !== undefined) data.is24hDriveUp = Boolean(body.is24hDriveUp);
    if (body.isIndoor !== undefined) data.isIndoor = Boolean(body.isIndoor);
    if (body.active !== undefined) data.active = Boolean(body.active);

    const unit = await prisma.unit.update({ where: { id }, data, include: { location: true } });
    return NextResponse.json(serializeForJson(unit));
  } catch (error) {
    console.error('Error updating unit:', error);
    return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const contractCount = await prisma.contract.count({ where: { unitId: id } });
    if (contractCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete unit with contracts attached' },
        { status: 400 }
      );
    }

    await prisma.unit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json({ error: 'Failed to delete unit' }, { status: 500 });
  }
}
