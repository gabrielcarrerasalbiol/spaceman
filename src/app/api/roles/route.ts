import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, isAdmin } from '@/lib/permissions';

// GET /api/roles - Get all roles
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = {
      id: (session.user as any).id,
      email: session.user.email || '',
      role: (session.user as any).role,
    };

    const canManageRoles = isAdmin(currentUser) || await hasPermission(currentUser, 'actions.roles.manage');

    if (!canManageRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      orderBy: { priority: 'desc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Roles fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = {
      id: (session.user as any).id,
      email: session.user.email || '',
      role: (session.user as any).role,
    };

    const canManageRoles = isAdmin(currentUser) || await hasPermission(currentUser, 'actions.roles.manage');

    if (!canManageRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, label, description, permissions, priority } = body;

    if (!name || !label) {
      return NextResponse.json(
        { error: 'Name and label are required' },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRole = await prisma.role.findFirst({
      where: { name: name.toUpperCase() }
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        label,
        description: description || null,
        permissions: permissions || {},
        priority: priority || 0,
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Role creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
