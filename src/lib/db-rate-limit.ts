import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type DbRateLimitInput = {
  scope: string;
  identifier: string;
  windowMs: number;
  max: number;
};

export type DbRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureRateLimitTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS api_rate_limits (
          key TEXT PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 0,
          reset_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_api_rate_limits_reset_at ON api_rate_limits(reset_at)
      `);
    })();
  }

  await ensureTablePromise;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  return forwardedFor || realIp || cfIp || 'unknown-ip';
}

export async function enforceDbRateLimit(input: DbRateLimitInput): Promise<DbRateLimitResult> {
  await ensureRateLimitTable();

  const key = `${input.scope}:${input.identifier}`;
  const windowSeconds = Math.max(1, Math.ceil(input.windowMs / 1000));

  const rows = await prisma.$queryRaw<Array<{ count: number; reset_epoch: bigint | number }>>`
    INSERT INTO api_rate_limits (key, count, reset_at, updated_at)
    VALUES (${key}, 1, NOW() + (${windowSeconds} * INTERVAL '1 second'), NOW())
    ON CONFLICT (key) DO UPDATE
      SET count = CASE
          WHEN api_rate_limits.reset_at <= NOW() THEN 1
          ELSE api_rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN api_rate_limits.reset_at <= NOW() THEN NOW() + (${windowSeconds} * INTERVAL '1 second')
          ELSE api_rate_limits.reset_at
        END,
        updated_at = NOW()
    RETURNING count, EXTRACT(EPOCH FROM reset_at)::bigint AS reset_epoch
  `;

  const row = rows[0];
  const used = Number(row?.count ?? 1);
  const resetEpoch = Number(row?.reset_epoch ?? Math.ceil(Date.now() / 1000));
  const resetAt = resetEpoch * 1000;

  return {
    allowed: used <= input.max,
    limit: input.max,
    remaining: Math.max(0, input.max - used),
    resetAt,
  };
}

export function createRateLimitResponse(result: DbRateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  const response = NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    { status: 429 }
  );

  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

  return response;
}
