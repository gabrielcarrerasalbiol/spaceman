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

    const areas = await prisma.locationArea.findMany({
      where: { locationId: id },
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
                        email: true,
                        phone: true,
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
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(serializeForJson(areas));
  } catch (error) {
    console.error('Error fetching location areas:', error);
    return NextResponse.json({ error: 'Failed to fetch location areas' }, { status: 500 });
  }
}

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

    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Area name is required' }, { status: 400 });
    }

    const maxSort = await prisma.locationArea.aggregate({
      where: { locationId: id },
      _max: { sortOrder: true },
    });

    const area = await prisma.locationArea.create({
      data: {
        locationId: id,
        name,
        description: body.description || null,
        backgroundImageUrl: body.backgroundImageUrl || null,
        canvasWidth: body.canvasWidth ? Number(body.canvasWidth) : 1400,
        canvasHeight: body.canvasHeight ? Number(body.canvasHeight) : 820,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
        active: body.active !== undefined ? Boolean(body.active) : true,
      },
    });

    return NextResponse.json(serializeForJson(area), { status: 201 });
  } catch (error) {
    console.error('Error creating location area:', error);
    return NextResponse.json({ error: 'Failed to create location area' }, { status: 500 });
  }
}
