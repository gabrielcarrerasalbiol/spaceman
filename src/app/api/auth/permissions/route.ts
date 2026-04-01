import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Basic permissions structure
const DEFAULT_PERMISSIONS = {
  dashboard: { overview: true },
  settings: { profile: true, password: true },
};

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, permissions: {} });
    }

    // Return basic permissions for authenticated users
    return NextResponse.json({
      success: true,
      permissions: DEFAULT_PERMISSIONS,
      role: {
        id: 1,
        name: 'user',
        label: 'User',
      },
    });
  } catch (error) {
    console.error('[Permissions API] Error:', error);
    return NextResponse.json({ success: false, permissions: {} });
  }
}
