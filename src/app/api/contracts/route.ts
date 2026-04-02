import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { serializeForJson } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const contracts = await prisma.contract.findMany({
      where: search
        ? {
            OR: [
              { contractNumber: { contains: search, mode: 'insensitive' } },
              { client: { firstName: { contains: search, mode: 'insensitive' } } },
              { client: { lastName: { contains: search, mode: 'insensitive' } } },
              { unit: { code: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: {
        client: true,
        unit: { include: { location: true } },
        location: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(serializeForJson(contracts));
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const {
      contractNumber,
      clientId,
      unitId,
      locationId,
      startDate,
      endDate,
      weeklyRate,
      monthlyRate,
      depositAmount,
      paymentMethod,
      notes,
      status,
    } = body;

    if (!clientId || !unitId || !locationId || !startDate) {
      return NextResponse.json(
        { error: 'Client, unit, location and start date are required' },
        { status: 400 }
      );
    }

    const generatedContractNumber =
      contractNumber || `CTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const contract = await prisma.contract.create({
      data: {
        contractNumber: generatedContractNumber,
        clientId,
        unitId,
        locationId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        weeklyRate: weeklyRate !== undefined && weeklyRate !== '' ? Number(weeklyRate) : null,
        monthlyRate: monthlyRate !== undefined && monthlyRate !== '' ? Number(monthlyRate) : null,
        depositAmount: depositAmount !== undefined && depositAmount !== '' ? Number(depositAmount) : null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        status: status || 'DRAFT',
        createdById: BigInt(user.id),
        updatedById: BigInt(user.id),
      },
      include: {
        client: true,
        unit: true,
        location: true,
      },
    });

    return NextResponse.json(serializeForJson(contract), { status: 201 });
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
}
