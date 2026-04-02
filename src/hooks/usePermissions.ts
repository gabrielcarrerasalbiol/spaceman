'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/lib/permissions';

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

export function usePermissions() {
  const { data: session, status } = useSession();
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const user = session?.user ? {
    id: (session.user as any).id,
    email: session.user.email || '',
    name: session.user.name,
    role: (session.user as any).role as UserRole | undefined,
  } : null;

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      if (!isAuthenticated) {
        if (mounted) {
          setPermissionMap({});
          setPermissionsLoaded(true);
        }
        return;
      }

      try {
        const response = await fetch('/api/auth/permissions');
        if (!response.ok) {
          if (mounted) setPermissionsLoaded(true);
          return;
        }

        const payload = await response.json();
        const flattened = flattenPermissions(payload?.permissions ?? {});

        if (mounted) {
          setPermissionMap(flattened);
          setPermissionsLoaded(true);
        }
      } catch {
        if (mounted) setPermissionsLoaded(true);
      }
    }

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const hasPermission = useMemo(() => {
    return (key: string, defaultValue = false) => {
      if (!isAuthenticated) return false;
      if (isAdmin) return true;
      if (permissionMap.all) return true;
      if (key in permissionMap) return Boolean(permissionMap[key]);
      return defaultValue;
    };
  }, [isAdmin, isAuthenticated, permissionMap]);

  const isOwner = (targetUserId: string) => {
    return user?.id === targetUserId;
  };

  const canManageUser = (targetUserId: string) => {
    if (!user) return false;
    return isAdmin || isOwner(targetUserId);
  };

  const canAccessAdminFeatures = isAdmin;
  const canManageRoles = hasPermission('actions.roles.manage');
  const canManageUsers = hasPermission('actions.users.manage');

  return {
    user,
    isAdmin,
    isAuthenticated,
    isOwner,
    canManageUser,
    canAccessAdminFeatures,
    canManageRoles,
    canManageUsers,
    hasPermission,
    permissionMap,
    loading: status === 'loading' || (isAuthenticated && !permissionsLoaded),
  };
}
