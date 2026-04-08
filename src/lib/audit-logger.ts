import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@prisma/client';

export interface AuditLogOptions {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs an audit event to the database
 *
 * @param userId - The user ID as a string (will be converted to BigInt)
 * @param options - Audit log options including action, entity type, and description
 *
 * @example
 * await logAudit(currentUser.id, {
 *   action: 'CREATE',
 *   entityType: 'CLIENT',
 *   entityId: client.id,
 *   description: 'Created new client',
 *   metadata: { clientName: 'John Doe', email: 'john@example.com' }
 * });
 */
export async function logAudit(
  userId: string,
  options: AuditLogOptions
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: BigInt(userId),
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId || null,
        description: options.description,
        metadata: options.metadata || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });
  } catch (error) {
    // Fail silently to avoid breaking main operations
    // Log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to create audit log:', error);
    }
  }
}

/**
 * Helper function to extract IP address and user agent from NextRequest
 *
 * @param request - The Request object from Next.js API routes
 * @returns Object containing ipAddress and userAgent
 */
export function extractRequestInfo(request: Request): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  const headers = request.headers;

  // Try various headers for IP address (in order of preference)
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    undefined;

  const userAgent = headers.get('user-agent') || undefined;

  return { ipAddress, userAgent };
}
