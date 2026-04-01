'use client';

import { useSession } from 'next-auth/react';
import { UserRole } from '@/lib/permissions';

export function usePermissions() {
  const { data: session, status } = useSession();

  const user = session?.user ? {
    id: (session.user as any).id,
    email: session.user.email || '',
    name: session.user.name,
    role: (session.user as any).role as UserRole | undefined,
  } : null;

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = status === 'authenticated';

  const isOwner = (targetUserId: string) => {
    return user?.id === targetUserId;
  };

  const canManageUser = (targetUserId: string) => {
    if (!user) return false;
    return isAdmin || isOwner(targetUserId);
  };

  const canAccessAdminFeatures = isAdmin;

  return {
    user,
    isAdmin,
    isAuthenticated,
    isOwner,
    canManageUser,
    canAccessAdminFeatures,
    loading: status === 'loading',
  };
}
