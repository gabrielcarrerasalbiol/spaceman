import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const email = session.user.email;

    // Get the current user with role
    const currentUser = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      include: { role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has no role, assign ADMIN role
    if (!currentUser.roleId) {
      const adminRole = await prisma.role.findFirst({
        where: { name: 'ADMIN' },
      });

      if (adminRole) {
        const updatedUser = await prisma.users.update({
          where: { id: BigInt(userId) },
          data: { roleId: adminRole.id },
          include: { role: true },
        });

        return NextResponse.json({
          message: 'Role assigned successfully',
          user: {
            id: updatedUser.id.toString(),
            email: updatedUser.email,
            username: updatedUser.username,
            role: updatedUser.role?.name || 'USER',
          },
        });
      }
    }

    return NextResponse.json({
      message: 'User already has a role',
      user: {
        id: currentUser.id.toString(),
        email: currentUser.email,
        username: currentUser.username,
        role: currentUser.role?.name || 'USER',
        roleId: currentUser.roleId,
      },
    });
  } catch (error) {
    console.error('Role fix error:', error);
    return NextResponse.json(
      { error: 'Failed to fix role' },
      { status: 500 }
    );
  }
}
