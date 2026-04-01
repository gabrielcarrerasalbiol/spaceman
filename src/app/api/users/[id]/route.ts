import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageUser, isAdmin } from '@/lib/permissions';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = {
      id: (session.user as any).id,
      role: (session.user as any).role,
    };

    const { id } = await params;

    if (!canManageUser(currentUser as any, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.users.findUnique({
      where: { id: BigInt(id) },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id.toString(),
      email: user.email,
      username: user.username,
      role: user.role?.name || 'USER',
      active: user.active && !user.banned,
      banned: user.banned,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = {
      id: (session.user as any).id,
      role: (session.user as any).role,
    };

    const { id } = await params;

    if (!canManageUser(currentUser as any, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, role, active } = body;

    const updateData: any = {};

    if (username !== undefined) updateData.username = username || null;
    if (email !== undefined) {
      // Check if email is already used by another user
      const existingUser = await prisma.users.findFirst({
        where: { 
          email,
          id: { not: BigInt(id) }
        },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
      updateData.email = email;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwdModifiedAt = new Date();
    }

    // Only admins can change role and active status
    if (isAdmin(currentUser as any)) {
      if (role !== undefined) {
        const roleRecord = await prisma.role.findFirst({
          where: { name: role },
        });
        updateData.roleId = roleRecord?.id || null;
      }
      if (active !== undefined) {
        updateData.active = active;
        updateData.banned = !active;
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: { role: true },
    });

    return NextResponse.json({
      id: updatedUser.id.toString(),
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role?.name || 'USER',
      active: updatedUser.active && !updatedUser.banned,
      banned: updatedUser.banned,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = {
      id: (session.user as any).id,
      role: (session.user as any).role,
    };

    if (!isAdmin(currentUser as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await prisma.users.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
