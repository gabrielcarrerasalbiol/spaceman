import { auth } from '@/lib/auth';

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
