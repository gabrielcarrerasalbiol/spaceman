import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { logAudit, extractRequestInfo } from '@/lib/audit-logger';
import { serializeForJson } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            unit: true,
            location: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json(serializeForJson(client));
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
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

    const allowed = [
      'firstName',
      'lastName',
      'companyName',
      'email',
      'phone',
      'billingEmail',
      'notes',
      'status',
      'addressLine1',
      'addressLine2',
      'townCity',
      'county',
      'postcode',
      'country',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = body[key] || null;
      }
    }

    const client = await prisma.client.update({ where: { id }, data });

    // Log the update action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'UPDATE',
      entityType: 'CLIENT',
      entityId: client.id,
      description: `Updated client: ${client.firstName} ${client.lastName}${client.companyName ? ` (${client.companyName})` : ''}`,
      metadata: {
        firstName: client.firstName,
        lastName: client.lastName,
        companyName: client.companyName,
        email: client.email,
        status: client.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(serializeForJson(client));
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
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

    const contractCount = await prisma.contract.count({ where: { clientId: id } });
    if (contractCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with contracts attached' },
        { status: 400 }
      );
    }

    // Get client details before deletion for logging
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await prisma.client.delete({ where: { id } });

    // Log the delete action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'DELETE',
      entityType: 'CLIENT',
      entityId: id,
      description: `Deleted client: ${client.firstName} ${client.lastName}${client.companyName ? ` (${client.companyName})` : ''}`,
      metadata: {
        firstName: client.firstName,
        lastName: client.lastName,
        companyName: client.companyName,
        email: client.email,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
