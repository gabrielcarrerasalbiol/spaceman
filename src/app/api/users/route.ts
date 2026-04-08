import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { logAudit, extractRequestInfo } from '@/lib/audit-logger';
import bcrypt from 'bcryptjs';

// GET /api/users - List users (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = { name: role };
    }

    const users = await prisma.users.findMany({
      where,
      include: {
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id.toString(),
      email: u.email,
      username: u.username,
      role: u.role?.name || 'USER',
      active: u.active && !u.banned,
      banned: u.banned,
      createdAt: u.createdAt.toISOString(),
      lastLogin: u.lastLogin?.toISOString() || null,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, username, password, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find or create role
    let roleRecord = null;
    if (role) {
      roleRecord = await prisma.role.findFirst({
        where: { name: role },
      });
    }

    // Create user
    const newUser = await prisma.users.create({
      data: {
        email,
        username: username || null,
        password: hashedPassword,
        roleId: roleRecord?.id || null,
        active: true,
        banned: false,
      },
      include: {
        role: true,
      },
    });

    // Log the action
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAudit(user.id, {
      action: 'CREATE',
      entityType: 'USER',
      entityId: newUser.id.toString(),
      description: `Created new user: ${email}`,
      metadata: {
        email,
        username,
        role: roleRecord?.name || 'USER',
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      id: newUser.id.toString(),
      email: newUser.email,
      username: newUser.username,
      role: newUser.role?.name || 'USER',
      active: newUser.active && !newUser.banned,
      createdAt: newUser.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
