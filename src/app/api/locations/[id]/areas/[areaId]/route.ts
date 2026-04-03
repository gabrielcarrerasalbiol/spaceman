import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { serializeForJson } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; areaId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, areaId } = await params;

    const area = await prisma.locationArea.findFirst({
      where: { id: areaId, locationId: id },
      include: {
        placements: {
          include: {
            unit: {
              select: {
                id: true,
                code: true,
                unitNumber: true,
                name: true,
                sizeSqft: true,
                status: true,
                contracts: {
                  where: {
                    status: 'ACTIVE',
                  },
                  orderBy: {
                    startDate: 'desc',
                  },
                  take: 1,
                  select: {
                    id: true,
                    contractNumber: true,
                    startDate: true,
                    endDate: true,
                    client: {
                      select: {
                        companyName: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { zIndex: 'asc' },
        },
      },
    });

    if (!area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    return NextResponse.json(serializeForJson(area));
  } catch (error) {
    console.error('Error fetching location area:', error);
    return NextResponse.json({ error: 'Failed to fetch location area' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; areaId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, areaId } = await params;
    const body = await request.json();

    const area = await prisma.locationArea.findFirst({
      where: { id: areaId, locationId: id },
      select: { id: true },
    });

    if (!area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const areaUpdate = await tx.locationArea.update({
        where: { id: areaId },
        data: {
          name: body.name !== undefined ? String(body.name).trim() : undefined,
          description: body.description !== undefined ? body.description || null : undefined,
          backgroundImageUrl: body.backgroundImageUrl !== undefined ? body.backgroundImageUrl || null : undefined,
          canvasWidth: body.canvasWidth !== undefined ? Number(body.canvasWidth) : undefined,
          canvasHeight: body.canvasHeight !== undefined ? Number(body.canvasHeight) : undefined,
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
          active: body.active !== undefined ? Boolean(body.active) : undefined,
        },
      });

      if (Array.isArray(body.placements)) {
        const unitIds = body.placements.map((placement: any) => String(placement.unitId));
        const locationUnits = await tx.unit.findMany({
          where: { id: { in: unitIds }, locationId: id },
          select: { id: true },
        });

        const allowed = new Set(locationUnits.map((unit) => unit.id));
        const safePlacements = body.placements.filter((placement: any) => allowed.has(String(placement.unitId)));

        await tx.unitAreaPlacement.deleteMany({ where: { areaId } });

        if (safePlacements.length > 0) {
          await tx.unitAreaPlacement.createMany({
            data: safePlacements.map((placement: any, index: number) => ({
              areaId,
              unitId: String(placement.unitId),
              shape: placement.shape === 'POLYGON' ? 'POLYGON' : 'RECTANGLE',
              x: Number(placement.x || 0),
              y: Number(placement.y || 0),
              width: Number(placement.width || 120),
              height: Number(placement.height || 60),
              rotation: Number(placement.rotation || 0),
              zIndex: Number(placement.zIndex ?? index),
              label: placement.label || null,
              points: placement.points || null,
            })),
          });
        }
      }

      return areaUpdate;
    });

    return NextResponse.json(serializeForJson(updated));
  } catch (error) {
    console.error('Error updating location area:', error);
    return NextResponse.json({ error: 'Failed to update location area' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; areaId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, areaId } = await params;

    const area = await prisma.locationArea.findFirst({ where: { id: areaId, locationId: id } });
    if (!area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    await prisma.locationArea.delete({ where: { id: areaId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location area:', error);
    return NextResponse.json({ error: 'Failed to delete location area' }, { status: 500 });
  }
}
