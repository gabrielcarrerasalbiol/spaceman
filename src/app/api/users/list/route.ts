import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, isAdmin } from '@/lib/permissions';

export async function GET(request: NextRequest) {
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

    const canManageUsers = isAdmin(currentUser) || await hasPermission(currentUser, 'actions.users.manage');
    if (!canManageUsers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users with their roles
    const users = await prisma.users.findMany({
      include: {
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id.toString(),
      email: user.email,
      username: user.username,
      role: user.role?.name || 'USER',
      roleId: user.roleId,
      active: user.active && !user.banned,
      banned: user.banned,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { userId, roleId } = body;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = {
      id: (session.user as any).id,
      email: session.user.email || '',
      role: (session.user as any).role,
    };

    const canManageUsers = isAdmin(currentUser) || await hasPermission(currentUser, 'actions.users.manage');
    if (!canManageUsers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update user role
    const updatedUser = await prisma.users.update({
      where: { id: BigInt(userId) },
      data: { roleId: roleId ? Number(roleId) : null },
      include: { role: true },
    });

    return NextResponse.json({
      id: updatedUser.id.toString(),
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role?.name || 'USER',
      roleId: updatedUser.roleId,
    });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}
