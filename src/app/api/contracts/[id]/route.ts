import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: true,
        unit: { include: { location: true } },
        location: true,
      },
    });

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
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

    const data: any = {
      updatedById: BigInt(user.id),
    };

    const scalarFields = ['contractNumber', 'clientId', 'unitId', 'locationId', 'paymentMethod', 'notes', 'status'];
    for (const key of scalarFields) {
      if (body[key] !== undefined) data[key] = body[key] || null;
    }

    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.signedAt !== undefined) data.signedAt = body.signedAt ? new Date(body.signedAt) : null;

    const numericFields = ['billingDay', 'weeklyRate', 'monthlyRate', 'depositAmount'];
    for (const key of numericFields) {
      if (body[key] !== undefined) {
        data[key] = body[key] === '' || body[key] === null ? null : Number(body[key]);
      }
    }

    const contract = await prisma.contract.update({
      where: { id },
      data,
      include: {
        client: true,
        unit: true,
        location: true,
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
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

    await prisma.contract.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
}
