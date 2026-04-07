import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

async function getOrCreateSettingsRow() {
  const byDefaultId = await prisma.settings.findUnique({
    where: { id: 'default' },
  });
  if (byDefaultId) return byDefaultId;

  const existing = await prisma.settings.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  if (existing) return existing;

  return prisma.settings.create({
    data: {
      id: 'default',
    },
  });
}

// GET - Prepare import data (fetch deal and available options)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await getOrCreateSettingsRow();
    const hubspotConfig = (settings.hubspotConfig as any) || {};

    if (!hubspotConfig.enabled || !hubspotConfig.apiKey) {
      return NextResponse.json(
        { error: 'HubSpot integration is not configured' },
        { status: 400 }
      );
    }

    // Fetch the deal
    const deal = await (prisma as any).hubSpotDeal.findUnique({
      where: { id: params.id },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // If already imported, return existing client/contract info
    let existingClient = null;
    let existingContract = null;

    if (deal.clientId) {
      existingClient = await prisma.client.findUnique({
        where: { id: deal.clientId },
      });
    }

    if (deal.contractId) {
      existingContract = await prisma.contract.findUnique({
        where: { id: deal.contractId },
        include: {
          client: true,
          unit: true,
          location: true,
        },
      });
    }

    // Fetch available locations and units
    const locations = await prisma.location.findMany({
      where: { active: true },
      include: {
        units: {
          where: {
            status: 'AVAILABLE',
          },
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            sizeSqft: true,
            weeklyRate: true,
            monthlyRate: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch all active clients for selection
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      deal,
      existingClient,
      existingContract,
      locations: locations.map((loc: any) => ({
        ...loc,
        units: loc.units.filter((u: any) => u.weeklyRate !== null || u.monthlyRate !== null),
      })),
      clients,
    });
  } catch (error) {
    console.error('Error preparing HubSpot deal import:', error);
    return NextResponse.json(
      {
        error: 'Failed to prepare import',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Complete the import (create client and/or contract)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clientId,
      createNewClient,
      clientData,
      unitId,
      locationId,
      startDate,
      endDate,
      weeklyRate,
      monthlyRate,
      depositAmount,
      paymentMethod,
      notes,
    } = body;

    // Fetch the deal
    const deal = await (prisma as any).hubSpotDeal.findUnique({
      where: { id: params.id },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Determine or create client
    let finalClientId = clientId;

    if (createNewClient && clientData) {
      // Create new client from deal data or provided data
      const newClient = await prisma.client.create({
        data: {
          firstName: clientData.firstName || 'Unknown',
          lastName: clientData.lastName || 'Unknown',
          companyName: clientData.companyName || null,
          email: clientData.email || null,
          phone: clientData.phone || null,
          billingEmail: clientData.billingEmail || null,
          notes: clientData.notes || `Imported from HubSpot deal: ${deal.dealName}`,
          addressLine1: clientData.addressLine1 || null,
          addressLine2: clientData.addressLine2 || null,
          townCity: clientData.townCity || null,
          county: clientData.county || null,
          postcode: clientData.postcode || null,
          country: clientData.country || null,
          createdById: BigInt(user.id),
          updatedById: BigInt(user.id),
        },
      });
      finalClientId = newClient.id;
    }

    if (!finalClientId) {
      return NextResponse.json(
        { error: 'Client is required' },
        { status: 400 }
      );
    }

    // Update deal with client reference
    await (prisma as any).hubSpotDeal.update({
      where: { id: params.id },
      data: {
        clientId: finalClientId,
        importedAt: new Date(),
      },
    });

    // If unit and location provided, create contract
    if (unitId && locationId && startDate) {
      const generatedContractNumber = `CTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const contract = await prisma.$transaction(async (tx) => {
        const created = await tx.contract.create({
          data: {
            contractNumber: generatedContractNumber,
            clientId: finalClientId,
            unitId,
            locationId,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            weeklyRate: weeklyRate !== undefined && weeklyRate !== '' ? Number(weeklyRate) : null,
            monthlyRate: monthlyRate !== undefined && monthlyRate !== '' ? Number(monthlyRate) : null,
            depositAmount: depositAmount !== undefined && depositAmount !== '' ? Number(depositAmount) : null,
            paymentMethod: paymentMethod || null,
            notes: notes || `Imported from HubSpot deal: ${deal.dealName}`,
            status: 'DRAFT',
            createdById: BigInt(user.id),
            updatedById: BigInt(user.id),
          },
          include: {
            client: true,
            unit: true,
            location: true,
          },
        });

        // Update deal with contract reference
        await (tx as any).hubSpotDeal.update({
          where: { id: params.id },
          data: { contractId: created.id },
        });

        return created;
      });

      return NextResponse.json({
        success: true,
        message: 'Successfully imported deal and created contract',
        client: await prisma.client.findUnique({ where: { id: finalClientId } }),
        contract,
      });
    }

    // If no contract created, just return client info
    return NextResponse.json({
      success: true,
      message: 'Successfully linked deal to client',
      client: await prisma.client.findUnique({ where: { id: finalClientId } }),
    });
  } catch (error) {
    console.error('Error importing HubSpot deal:', error);
    return NextResponse.json(
      {
        error: 'Failed to import deal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
