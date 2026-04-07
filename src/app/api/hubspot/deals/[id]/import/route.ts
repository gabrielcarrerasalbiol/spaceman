import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

const HUBSPOT_IMPORT_ASSOCIATION_OBJECT_TYPES = [
  'companies',
  'contacts',
  'line_items',
  'tickets',
  'quotes',
  'products',
  'calls',
  'emails',
  'meetings',
  'notes',
  'tasks',
];

const HUBSPOT_IMPORT_PROPERTY_BATCH_SIZE = 150;

const CORE_DEAL_PROPERTIES = [
  'dealname',
  'amount',
  'dealstage',
  'pipeline',
  'closedate',
  'hubspot_owner_id',
  'unit_number',
  'unit_type',
  'unit_size',
  'location_name',
  'start_date',
  'end_date',
  'weekly_rate',
  'monthly_rate',
];

type DealPipelineMetadata = {
  pipelineLabelById: Record<string, string>;
  stageLabelById: Record<string, string>;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllDealPropertyNames(apiKey: string): Promise<string[]> {
  const names: string[] = [];
  let after: string | undefined;

  do {
    const url = new URL('https://api.hubapi.com/crm/v3/properties/deals');
    url.searchParams.append('limit', '500');
    url.searchParams.append('archived', 'false');
    if (after) {
      url.searchParams.append('after', after);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot properties API error: ${error}`);
    }

    const data = await response.json();
    const pageNames = (data.results || [])
      .map((property: any) => property?.name)
      .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0);

    names.push(...pageNames);
    after = data.paging?.next?.after;
  } while (after);

  return Array.from(new Set([...CORE_DEAL_PROPERTIES, ...names]));
}

async function fetchDealPipelineMetadata(apiKey: string): Promise<DealPipelineMetadata> {
  const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return { pipelineLabelById: {}, stageLabelById: {} };
  }

  const data = await response.json();
  const pipelines = data.results || [];
  const pipelineLabelById: Record<string, string> = {};
  const stageLabelById: Record<string, string> = {};

  for (const pipeline of pipelines) {
    const pipelineId = String(pipeline?.id || '').trim();
    const pipelineLabel = String(pipeline?.label || '').trim();
    if (pipelineId && pipelineLabel) {
      pipelineLabelById[pipelineId] = pipelineLabel;
    }

    const stages = pipeline?.stages || [];
    for (const stage of stages) {
      const stageId = String(stage?.id || '').trim();
      const stageLabel = String(stage?.label || '').trim();
      if (stageId && stageLabel) {
        stageLabelById[stageId] = stageLabel;
      }
    }
  }

  return { pipelineLabelById, stageLabelById };
}

async function fetchDealStagePropertyLabels(apiKey: string): Promise<Record<string, string>> {
  const response = await fetch('https://api.hubapi.com/crm/v3/properties/deals/dealstage', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {};
  }

  const data = await response.json();
  const options = data.options || [];
  const labelsByValue: Record<string, string> = {};

  for (const option of options) {
    const value = String(option?.value || '').trim();
    const label = String(option?.label || '').trim();
    if (value && label) {
      labelsByValue[value] = label;
    }
  }

  return labelsByValue;
}

async function fetchDealAssociationDetails(apiKey: string, dealId: string): Promise<Record<string, any[]>> {
  const details: Record<string, any[]> = {};

  for (const objectType of HUBSPOT_IMPORT_ASSOCIATION_OBJECT_TYPES) {
    try {
      const response = await fetch(`https://api.hubapi.com/crm/v3/associations/deals/${objectType}/batch/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [{ id: dealId }],
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const result = (data.results || []).find((r: any) => r?.from?.id === dealId);
      details[objectType] = (result?.to || []).map((item: any) => ({
        id: item.id,
        associationTypes: item.type || item.types || null,
      }));
    } catch {
      // Ignore unsupported association object types for this portal.
    }
  }

  return details;
}

async function fetchFullHubspotDeal(apiKey: string, dealId: string): Promise<any> {
  const allPropertyNames = await fetchAllDealPropertyNames(apiKey);
  const propertyChunks = chunkArray(allPropertyNames, HUBSPOT_IMPORT_PROPERTY_BATCH_SIZE);
  const { pipelineLabelById, stageLabelById } = await fetchDealPipelineMetadata(apiKey);
  const stageLabelByPropertyValue = await fetchDealStagePropertyLabels(apiKey);

  const baseUrl = new URL(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`);
  baseUrl.searchParams.append('associations', 'companies,contacts');
  baseUrl.searchParams.append('properties', 'dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id');

  const baseResponse = await fetch(baseUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!baseResponse.ok) {
    const error = await baseResponse.text();
    throw new Error(`HubSpot deal API error: ${error}`);
  }

  const baseDeal = await baseResponse.json();
  const mergedDeal = {
    ...baseDeal,
    properties: { ...(baseDeal.properties || {}) },
  };

  for (const propertyChunk of propertyChunks) {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/batch/read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [{ id: dealId }],
        properties: propertyChunk,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot batch/read API error: ${error}`);
    }

    const data = await response.json();
    const result = (data.results || []).find((r: any) => r.id === dealId);
    if (!result) continue;

    mergedDeal.properties = {
      ...(mergedDeal.properties || {}),
      ...(result.properties || {}),
    };
  }

  const pipelineId = String(mergedDeal?.properties?.pipeline || '').trim();
  const stageId = String(mergedDeal?.properties?.dealstage || '').trim();

  const pipelineLabel = pipelineLabelById[pipelineId] || pipelineId || null;
  const stageLabel = stageLabelById[stageId] || stageLabelByPropertyValue[stageId] || stageId || null;

  mergedDeal.pipelineLabel = pipelineLabel;
  mergedDeal.stageLabel = stageLabel;
  mergedDeal.properties = {
    ...(mergedDeal.properties || {}),
    pipeline_label: pipelineLabel,
    dealstage_label: stageLabel,
  };

  mergedDeal.associationDetails = await fetchDealAssociationDetails(apiKey, dealId);
  return mergedDeal;
}

async function fetchHubSpotOwnerById(apiKey: string, ownerId: string): Promise<any | null> {
  const ownerUrl = new URL(`https://api.hubapi.com/crm/v3/owners/${ownerId}`);
  ownerUrl.searchParams.append('idProperty', 'id');

  const response = await fetch(ownerUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

async function resolveHubSpotOwnerUserMatch(apiKey: string, dealData: any) {
  const ownerId = String(dealData?.properties?.hubspot_owner_id || '').trim();
  if (!ownerId) {
    return { hubspotOwner: null, matchedUser: null };
  }

  const hubspotOwner = await fetchHubSpotOwnerById(apiKey, ownerId);
  if (!hubspotOwner) {
    return { hubspotOwner: null, matchedUser: null };
  }

  const ownerEmail = normalizeText(hubspotOwner.email);
  const ownerFullName = normalizeText(`${hubspotOwner.firstName || ''} ${hubspotOwner.lastName || ''}`);

  const users = await prisma.users.findMany({
    where: { active: true },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });

  const matchedUser = users.find((candidate) => {
    const candidateEmail = normalizeText(candidate.email);
    const candidateUsername = normalizeText(candidate.username);
    return (
      (ownerEmail && candidateEmail === ownerEmail)
      || (ownerEmail && candidateUsername === ownerEmail)
      || (ownerFullName && candidateUsername === ownerFullName)
    );
  }) || null;

  return {
    hubspotOwner,
    matchedUser,
  };
}

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
    const hubspotConfig = ((settings as any).hubspotConfig as any) || {};

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

    let fullHubspotDeal: any = null;
    let ownerMatch = { hubspotOwner: null as any, matchedUser: null as any };

    try {
      fullHubspotDeal = await fetchFullHubspotDeal(hubspotConfig.apiKey, deal.id);
      ownerMatch = await resolveHubSpotOwnerUserMatch(hubspotConfig.apiKey, fullHubspotDeal);
    } catch (hubspotError) {
      console.error('Error fetching full HubSpot deal for import:', hubspotError);
    }

    // Fetch customer details from HubSpot using deal associations
    let hubspotContacts: any[] = [];
    let hubspotCompanies: any[] = [];

    try {
      const rawData = (fullHubspotDeal || deal.rawData) as any;
      const associations = rawData?.associations || {};

      // Fetch associated contacts
      const contactIds = associations.contacts?.results?.map((r: any) => r.id) || [];
      if (contactIds.length > 0) {
        const contactUrl = new URL('https://api.hubapi.com/crm/v3/objects/contacts/batch/read');
        const contactResponse = await fetch(contactUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: contactIds.map((id: string) => ({ id })),
            properties: ['firstname', 'lastname', 'email', 'phone', 'mobilephone', 'company', 'address', 'city', 'state', 'zip', 'country'],
          }),
        });
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          hubspotContacts = contactData.results || [];
        }
      }

      // Fetch associated companies
      const companyIds = associations.companies?.results?.map((r: any) => r.id) || [];
      if (companyIds.length > 0) {
        const companyUrl = new URL('https://api.hubapi.com/crm/v3/objects/companies/batch/read');
        const companyResponse = await fetch(companyUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: companyIds.map((id: string) => ({ id })),
            properties: ['name', 'domain', 'address', 'city', 'state', 'zip', 'country', 'phone'],
          }),
        });
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          hubspotCompanies = companyData.results || [];
        }
      }
    } catch (hubspotError) {
      console.error('Error fetching HubSpot associations:', hubspotError);
      // Continue without HubSpot data
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

    // Convert BigInt values to strings for JSON serialization
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(serializeBigInt);
      if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key]);
        }
        return result;
      }
      return obj;
    };

    return NextResponse.json({
      success: true,
      deal: serializeBigInt(deal),
      hubspotDealFull: serializeBigInt(fullHubspotDeal),
      hubspotOwner: serializeBigInt(ownerMatch.hubspotOwner),
      matchedSystemUser: serializeBigInt(ownerMatch.matchedUser),
      existingClient: existingClient ? serializeBigInt(existingClient) : null,
      existingContract: existingContract ? serializeBigInt(existingContract) : null,
      locations: serializeBigInt(locations.map((loc: any) => ({
        ...loc,
        units: loc.units.filter((u: any) => u.weeklyRate !== null || u.monthlyRate !== null),
      }))),
      clients: clients.map((c: any) => serializeBigInt(c)),
      hubspotContacts: serializeBigInt(hubspotContacts),
      hubspotCompanies: serializeBigInt(hubspotCompanies),
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

    const settings = await getOrCreateSettingsRow();
    const hubspotConfig = ((settings as any).hubspotConfig as any) || {};

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

    const rawDealData = (deal.rawData as any) || {};
    const ownerMatch = hubspotConfig.apiKey
      ? await resolveHubSpotOwnerUserMatch(hubspotConfig.apiKey, rawDealData)
      : { hubspotOwner: null as any, matchedUser: null as any };

    const actorUserId = ownerMatch.matchedUser?.id
      ? BigInt(ownerMatch.matchedUser.id)
      : BigInt(user.id);

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
          createdById: actorUserId,
          updatedById: actorUserId,
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
        isImported: true,
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
            createdById: actorUserId,
            updatedById: actorUserId,
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

      const client = await prisma.client.findUnique({ where: { id: finalClientId } });

      // Convert BigInt to string for JSON serialization
      const serializeBigInt = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'bigint') return obj.toString();
        if (Array.isArray(obj)) return obj.map(serializeBigInt);
        if (typeof obj === 'object') {
          const result: any = {};
          for (const key in obj) {
            result[key] = serializeBigInt(obj[key]);
          }
          return result;
        }
        return obj;
      };

      return NextResponse.json({
        success: true,
        message: 'Successfully imported deal and created contract',
        client: serializeBigInt(client),
        contract: serializeBigInt(contract),
      });
    }

    // If no contract created, just return client info
    const client = await prisma.client.findUnique({ where: { id: finalClientId } });

    // Convert BigInt to string for JSON serialization
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(serializeBigInt);
      if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key]);
        }
        return result;
      }
      return obj;
    };

    return NextResponse.json({
      success: true,
      message: 'Successfully linked deal to client',
      client: serializeBigInt(client),
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
