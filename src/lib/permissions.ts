import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type UserRole = 'ADMIN' | 'USER';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role?: UserRole;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return {
    id: (session.user as any).id,
    email: session.user.email || '',
    name: session.user.name,
    role: (session.user as any).role,
  };
}

export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN';
}

export function isOwner(user: SessionUser | null, targetUserId: string): boolean {
  if (!user) return false;
  return user.id === targetUserId;
}

export function canManageUser(currentUser: SessionUser | null, targetUserId: string): boolean {
  if (!currentUser) return false;
  return isAdmin(currentUser) || isOwner(currentUser, targetUserId);
}

export function canAccessAdminFeatures(user: SessionUser | null): boolean {
  return isAdmin(user);
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!isAdmin(user)) {
    throw new Error('Forbidden');
  }
  return user;
}

function flattenPermissions(input: unknown, prefix = ''): Record<string, boolean> {
  if (!input || typeof input !== 'object') return {};

  const source = input as Record<string, unknown>;
  const result: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'boolean') {
      result[nextKey] = value;
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenPermissions(value, nextKey));
    }
  }

  return result;
}

export async function getPermissionMapForUser(user: SessionUser | null): Promise<Record<string, boolean>> {
  if (!user) return {};
  if (isAdmin(user)) return { all: true };

  const roleName = String(user.role || 'USER').toUpperCase();
  const role = await prisma.role.findFirst({
    where: {
      name: roleName,
      active: true,
    },
    select: {
      permissions: true,
    },
  });

  return flattenPermissions(role?.permissions ?? {});
}

export async function hasPermission(user: SessionUser | null, key: string): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const map = await getPermissionMapForUser(user);
  return Boolean(map.all || map[key]);
}

export async function requirePermission(key: string): Promise<SessionUser> {
  const user = await requireAuth();
  const allowed = await hasPermission(user, key);
  if (!allowed) {
    throw new Error('Forbidden');
  }
  return user;
}
