import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/permissions';

type TestRequestPayload = {
  siteUrl?: string;
  apiUsername?: string;
  apiPassword?: string;
  endpoint?: string;
};

function normalizeUrl(siteUrl: string, endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${siteUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as TestRequestPayload;
    const siteUrl = (body.siteUrl || '').trim();
    const apiUsername = (body.apiUsername || '').trim();
    const apiPassword = (body.apiPassword || '').trim();
    const endpoint = (body.endpoint || '').trim();

    if (!siteUrl || !apiUsername || !apiPassword || !endpoint) {
      return NextResponse.json(
        { error: 'siteUrl, apiUsername, apiPassword and endpoint are required' },
        { status: 400 }
      );
    }

    const url = normalizeUrl(siteUrl, endpoint);
    const authHeader = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');
    const startedAt = Date.now();

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    const elapsedMs = Date.now() - startedAt;
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();

    let parsed: unknown = null;
    if (contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    const itemsCount = Array.isArray(parsed) ? parsed.length : null;

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: response.status,
          elapsedMs,
          url,
          itemsCount,
          preview: typeof parsed === 'object' && parsed !== null ? parsed : raw.slice(0, 500),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: response.status,
      elapsedMs,
      url,
      itemsCount,
      preview: Array.isArray(parsed) ? parsed.slice(0, 2) : parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
