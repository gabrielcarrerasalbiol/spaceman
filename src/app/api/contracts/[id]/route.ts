import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { logAudit, extractRequestInfo } from '@/lib/audit-logger';
import { serializeForJson } from '@/lib/utils';
import { syncMultipleUnitStatuses } from '@/lib/contracts';

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

    return NextResponse.json(serializeForJson(contract));
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

    const existingContract = await prisma.contract.findUnique({
      where: { id },
      select: { unitId: true },
    });

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

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

    const nextUnitId = body.unitId !== undefined ? body.unitId : existingContract.unitId;
    const nextLocationId = body.locationId !== undefined ? body.locationId : undefined;
    if (nextUnitId) {
      const selectedUnit = await prisma.unit.findUnique({
        where: { id: nextUnitId },
        select: { id: true, locationId: true },
      });

      if (!selectedUnit) {
        return NextResponse.json({ error: 'Selected unit not found' }, { status: 400 });
      }

      if (nextLocationId && selectedUnit.locationId !== nextLocationId) {
        return NextResponse.json({ error: 'Selected unit does not belong to this location' }, { status: 400 });
      }

      data.locationId = nextLocationId || selectedUnit.locationId;
    }

    const contract = await prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data,
        include: {
          client: true,
          unit: true,
          location: true,
        },
      });

      await syncMultipleUnitStatuses(tx, [existingContract.unitId, updated.unitId]);
      return updated;
    });

    // Log the update action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'UPDATE',
      entityType: 'CONTRACT',
      entityId: contract.id,
      description: `Updated contract: ${contract.contractNumber}`,
      metadata: {
        contractNumber: contract.contractNumber,
        clientName: `${contract.client.firstName} ${contract.client.lastName}`,
        unitCode: contract.unit.code,
        locationName: contract.location.name,
        status: contract.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(serializeForJson(contract));
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
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

    const existingContract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: true,
        unit: true,
        location: true,
      },
    });

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.contract.delete({ where: { id } });
      await syncMultipleUnitStatuses(tx, [existingContract.unitId]);
    });

    // Log the delete action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'DELETE',
      entityType: 'CONTRACT',
      entityId: id,
      description: `Deleted contract: ${existingContract.contractNumber}`,
      metadata: {
        contractNumber: existingContract.contractNumber,
        clientName: `${existingContract.client.firstName} ${existingContract.client.lastName}`,
        unitCode: existingContract.unit.code,
        locationName: existingContract.location.name,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
}
