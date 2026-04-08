import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageUser, isAdmin } from '@/lib/permissions';
import { auth } from '@/lib/auth';
import { extractRequestInfo, logAudit } from '@/lib/audit-logger';
import { createRateLimitResponse, enforceDbRateLimit, getClientIp } from '@/lib/db-rate-limit';
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

    const rateLimit = await enforceDbRateLimit({
      scope: 'users:update',
      identifier: `${String(currentUser.id)}:${getClientIp(request)}`,
      windowMs: 60_000,
      max: 40,
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
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
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      mobile: user.mobile,
      avatar: user.avatar,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      townCity: user.townCity,
      county: user.county,
      postcode: user.postcode,
      country: user.country,
      hubspotOwnerId: user.hubspotOwnerId,
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
    const {
      username,
      email,
      password,
      role,
      active,
      firstName,
      lastName,
      phone,
      mobile,
      avatar,
      addressLine1,
      addressLine2,
      townCity,
      county,
      postcode,
      country,
      hubspotOwnerId
    } = body;

    const textFieldMax: Record<string, number> = {
      username: 12,
      email: 255,
      firstName: 100,
      lastName: 100,
      phone: 20,
      mobile: 20,
      avatar: 500,
      addressLine1: 255,
      addressLine2: 255,
      townCity: 100,
      county: 100,
      postcode: 20,
      country: 100,
      hubspotOwnerId: 50,
    };

    for (const [field, max] of Object.entries(textFieldMax)) {
      const value = body[field];
      if (value === undefined || value === null) continue;

      if (typeof value !== 'string') {
        return NextResponse.json(
          { error: `${field} must be a string` },
          { status: 400 }
        );
      }

      const normalized = value.trim();
      if (normalized.length > max) {
        return NextResponse.json(
          { error: `${field} is too long (max ${max} characters)` },
          { status: 400 }
        );
      }
    }

    if (email !== undefined && typeof email === 'string' && email.trim().length === 0) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (username !== undefined) updateData.username = typeof username === 'string' ? (username.trim() || null) : null;
    if (email !== undefined) {
      const normalizedEmail = typeof email === 'string' ? email.trim() : '';

      // Check if email is already used by another user
      const existingUser = await prisma.users.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: BigInt(id) }
        },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
      updateData.email = normalizedEmail;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwdModifiedAt = new Date();
    }

    // Profile fields
    if (firstName !== undefined) updateData.firstName = typeof firstName === 'string' ? (firstName.trim() || null) : null;
    if (lastName !== undefined) updateData.lastName = typeof lastName === 'string' ? (lastName.trim() || null) : null;
    if (phone !== undefined) updateData.phone = typeof phone === 'string' ? (phone.trim() || null) : null;
    if (mobile !== undefined) updateData.mobile = typeof mobile === 'string' ? (mobile.trim() || null) : null;
    if (avatar !== undefined) updateData.avatar = typeof avatar === 'string' ? (avatar.trim() || null) : null;

    // Address fields
    if (addressLine1 !== undefined) updateData.addressLine1 = typeof addressLine1 === 'string' ? (addressLine1.trim() || null) : null;
    if (addressLine2 !== undefined) updateData.addressLine2 = typeof addressLine2 === 'string' ? (addressLine2.trim() || null) : null;
    if (townCity !== undefined) updateData.townCity = typeof townCity === 'string' ? (townCity.trim() || null) : null;
    if (county !== undefined) updateData.county = typeof county === 'string' ? (county.trim() || null) : null;
    if (postcode !== undefined) updateData.postcode = typeof postcode === 'string' ? (postcode.trim() || null) : null;
    if (country !== undefined) updateData.country = typeof country === 'string' ? (country.trim() || null) : null;

    // HubSpot integration
    if (hubspotOwnerId !== undefined) updateData.hubspotOwnerId = typeof hubspotOwnerId === 'string' ? (hubspotOwnerId.trim() || null) : null;

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

    const rateLimit = await enforceDbRateLimit({
      scope: 'users:delete',
      identifier: `${String(currentUser.id)}:${getClientIp(request)}`,
      windowMs: 60_000,
      max: 20,
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const { id } = await params;

    // Prevent self-deletion
    if (String(currentUser.id) === String(id)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.users.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.users.delete({
      where: { id: BigInt(id) },
    });

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(String(currentUser.id), {
      action: 'DELETE',
      entityType: 'USER',
      entityId: targetUser.id.toString(),
      description: `Deleted user: ${targetUser.email}`,
      metadata: {
        deletedEmail: targetUser.email,
        deletedUsername: targetUser.username,
        deletedFirstName: targetUser.firstName,
        deletedLastName: targetUser.lastName,
      },
      ipAddress,
      userAgent,
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
