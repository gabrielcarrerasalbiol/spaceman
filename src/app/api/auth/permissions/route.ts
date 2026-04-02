import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, permissions: {} });
    }

    const roleName = String((session.user as any).role || 'USER').toUpperCase();
    const role = await prisma.role.findFirst({
      where: {
        name: roleName,
        active: true,
      },
      select: {
        id: true,
        name: true,
        label: true,
        permissions: true,
      },
    });

    const permissions = role?.permissions ?? {};

    return NextResponse.json({
      success: true,
      permissions,
      role: role
        ? {
            id: role.id,
            name: role.name,
            label: role.label,
          }
        : null,
    });
  } catch (error) {
    console.error('[Permissions API] Error:', error);
    return NextResponse.json({ success: false, permissions: {} });
  }
}
