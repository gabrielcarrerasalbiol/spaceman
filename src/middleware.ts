import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

type RateRule = {
  windowMs: number;
  max: number;
};

type RateState = {
  count: number;
  resetAt: number;
};

const RATE_RULES: Record<string, RateRule> = {
  auth: { windowMs: 60_000, max: 20 },
  apiWrite: { windowMs: 60_000, max: 60 },
  apiRead: { windowMs: 60_000, max: 240 },
  dashboard: { windowMs: 60_000, max: 300 },
};

const globalRateStore = globalThis as unknown as {
  __spacemanRateStore?: Map<string, RateState>;
};

const rateStore = globalRateStore.__spacemanRateStore ?? new Map<string, RateState>();
globalRateStore.__spacemanRateStore = rateStore;

function getClientId(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const ip = forwardedFor || realIp || cfIp || 'unknown-ip';
  return ip;
}

function getRateBucket(pathname: string, method: string): keyof typeof RATE_RULES {
  if (pathname.startsWith('/api/auth')) return 'auth';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') return 'apiWrite';
  return 'apiRead';
}

function checkRateLimit(key: string, rule: RateRule) {
  const now = Date.now();
  const state = rateStore.get(key);

  if (!state || now >= state.resetAt) {
    const next: RateState = { count: 1, resetAt: now + rule.windowMs };
    rateStore.set(key, next);
    return {
      allowed: true,
      limit: rule.max,
      remaining: rule.max - 1,
      resetAt: next.resetAt,
    };
  }

  state.count += 1;
  rateStore.set(key, state);

  return {
    allowed: state.count <= rule.max,
    limit: rule.max,
    remaining: Math.max(0, rule.max - state.count),
    resetAt: state.resetAt,
  };
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

function applyRateLimitHeaders(
  response: NextResponse,
  info: { limit: number; remaining: number; resetAt: number }
) {
  response.headers.set('X-RateLimit-Limit', String(info.limit));
  response.headers.set('X-RateLimit-Remaining', String(info.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(info.resetAt / 1000)));
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  const rateBucket = getRateBucket(pathname, method);
  const clientId = getClientId(request);
  const rateKey = `${rateBucket}:${clientId}`;
  const rateInfo = checkRateLimit(rateKey, RATE_RULES[rateBucket]);

  if (!rateInfo.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateInfo.resetAt - Date.now()) / 1000));

    const blockedResponse = pathname.startsWith('/api')
      ? NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
      : new NextResponse('Too many requests. Please try again shortly.', { status: 429 });

    blockedResponse.headers.set('Retry-After', String(retryAfter));
    applyRateLimitHeaders(blockedResponse, rateInfo);
    return applySecurityHeaders(blockedResponse);
  }

  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/api');

  if (!isProtectedRoute) {
    return applySecurityHeaders(applyRateLimitHeaders(NextResponse.next(), rateInfo));
  }

  const isAuthInternal = pathname.startsWith('/api/auth');
  const isPublicSettingsGet = pathname === '/api/settings' && method === 'GET';

  if (isAuthInternal || isPublicSettingsGet) {
    return applySecurityHeaders(applyRateLimitHeaders(NextResponse.next(), rateInfo));
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  });

  const sessionCookie =
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value;

  if (!token && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    applyRateLimitHeaders(redirectResponse, rateInfo);
    return applySecurityHeaders(redirectResponse);
  }

  return applySecurityHeaders(applyRateLimitHeaders(NextResponse.next(), rateInfo));
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
