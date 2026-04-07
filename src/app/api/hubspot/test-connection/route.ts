import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { apiKey, portalId } = await request.json();

    if (!apiKey || !portalId) {
      return NextResponse.json(
        { error: 'API key and Portal ID are required' },
        { status: 400 }
      );
    }

    // Test HubSpot API connection
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals?limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        {
          error: 'Failed to connect to HubSpot API',
          details: error,
          status: response.status,
        },
        { status: 400 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to HubSpot API',
      portalId,
      total: data.total || 0,
    });
  } catch (error) {
    console.error('HubSpot connection test error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test HubSpot connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
