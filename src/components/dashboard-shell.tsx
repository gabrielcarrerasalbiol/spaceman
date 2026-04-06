'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X, Home, Settings, LogOut, Users, Monitor, MapPin, UserRound, Box, FileSignature, Globe } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';

type DashboardShellProps = {
  children: React.ReactNode;
};

const SIDEBAR_COLLAPSED_KEY = 'skeleton_sidebar_collapsed';

export default function DashboardShell({ children }: DashboardShellProps) {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [permissionFlags, setPermissionFlags] = useState<Record<string, boolean> | null>(null);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    let mounted = true;

    async function fetchPermissions() {
      try {
        const response = await fetch('/api/auth/permissions');
        if (!response.ok) return;

        const payload = await response.json();
        const flattened: Record<string, boolean> = {};

        function flattenPermissions(input: unknown, prefix = '') {
          if (!input || typeof input !== 'object') return;
          const source = input as Record<string, unknown>;

          for (const [key, value] of Object.entries(source)) {
            const nextKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'boolean') {
              flattened[nextKey] = value;
              continue;
            }
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              flattenPermissions(value, nextKey);
            }
          }
        }

        flattenPermissions(payload?.permissions ?? {});

        if (mounted) {
          setPermissionFlags(flattened);
        }
      } catch {
        // Keep fallback menu defaults when permissions cannot be fetched.
      }
    }

    fetchPermissions();

    return () => {
      mounted = false;
    };
  }, []);

  function hasPermission(key: string, defaultValue = false) {
    if (isAdmin) return true;
    if (!permissionFlags) return defaultValue;
    if (key in permissionFlags) return Boolean(permissionFlags[key]);
    return defaultValue;
  }

  const canSeeUsers = hasPermission('menus.users');
  const canSeeLocations = hasPermission('menus.locations');
  const canSeeUnits = hasPermission('menus.units');
  const canSeeClients = hasPermission('menus.clients');
  const canSeeContracts = hasPermission('menus.contracts');
  const canSeeWordPress = hasPermission('menus.wordpress', true);
  const canSeeSettings = hasPermission('menus.settings', true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    const shouldCollapse = saved === '1';

    setIsSidebarCollapsed(shouldCollapse);
    document.body.classList.toggle('sidebar-collapsed', shouldCollapse);
    document.body.classList.toggle('sidebar-expanded', !shouldCollapse);
  }, []);

  function toggleSidebarCollapsed() {
    setIsSidebarCollapsed((previous) => {
      const next = !previous;

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      }

      if (typeof document !== 'undefined') {
        document.body.classList.toggle('sidebar-collapsed', next);
        document.body.classList.toggle('sidebar-expanded', !next);
      }

      return next;
    });
  }

  function handleSignOut() {
    const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
    signOut({ callbackUrl });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-strong)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden border-r lg:fixed lg:inset-y-0 lg:flex lg:h-screen lg:w-[var(--sidebar-width)] lg:flex-col" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
        <div className="flex h-20 items-center border-b px-6" style={{ borderColor: 'var(--border)' }}>
          <Link href="/dashboard" className="flex items-center gap-3" prefetch={true}>
            {isSidebarCollapsed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
                <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>S</span>
              </div>
            ) : settings.siteLogo ? (
              <img
                src={settings.siteLogo}
                alt={settings.siteName}
                className="h-12 w-auto max-h-12 max-w-[200px] object-contain rounded-xl"
                style={{ filter: 'var(--logo-filter, none)' }}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
                <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{settings.siteName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            {!settings.siteLogo && (
              <span className="sidebar-brand-title text-lg font-bold">{settings.siteName}</span>
            )}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="sidebar-toggle-fab hidden md:inline-flex"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? '>' : '<'}
          </button>

          {/* Navigation */}
          <nav className="sidebar-nav-icon-red space-y-2">
            <Link
              href="/dashboard"
              className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard';
              }}
            >
              <Home className="h-5 w-5" />
              <span className="sidebar-nav-label">Dashboard</span>
            </Link>
            {canSeeUsers && (
              <Link
                href="/dashboard/users"
                className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard/users';
                }}
              >
                <Users className="h-5 w-5" />
                <span className="sidebar-nav-label">Users</span>
              </Link>
            )}
            {canSeeLocations && (
              <Link
                href="/dashboard/locations"
                className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard/locations';
                }}
              >
                <MapPin className="h-5 w-5" />
                <span className="sidebar-nav-label">Locations</span>
              </Link>
            )}
            {canSeeUnits && (
              <Link
                href="/dashboard/units"
                className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard/units';
                }}
              >
                <Box className="h-5 w-5" />
                <span className="sidebar-nav-label">Units</span>
              </Link>
            )}
            {canSeeClients && (
              <Link
                href="/dashboard/clients"
                className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard/clients';
                }}
              >
                <UserRound className="h-5 w-5" />
                <span className="sidebar-nav-label">Clients</span>
              </Link>
            )}
            {canSeeContracts && (
              <Link
                href="/dashboard/contracts"
                className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard/contracts';
                }}
              >
                <FileSignature className="h-5 w-5" />
                <span className="sidebar-nav-label">Contracts</span>
              </Link>
            )}
            {canSeeWordPress && (
              <Link
                href="/dashboard/wordpress"
                className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard/wordpress';
                }}
              >
                <Globe className="h-5 w-5" />
                <span className="sidebar-nav-label">WordPress</span>
              </Link>
            )}
            {canSeeSettings && (
              <Link
                href="/dashboard/settings"
                className="sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2 transition"
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard/settings';
                }}
              >
                <Settings className="h-5 w-5" />
                <span className="sidebar-nav-label">Settings</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t p-4 sidebar-session-panel" style={{ borderColor: 'var(--border)' }}>
          <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: 'var(--surface-0)', border: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>Session</p>
            <p className="mt-2 text-sm font-medium truncate" style={{ color: 'var(--text-strong)' }}>{session?.user?.email}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(session?.user as any)?.role || 'USER'}</p>
            <button
              onClick={handleSignOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition"
              style={{
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text-strong)',
                border: '1px solid var(--border)',
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] border-r transition-transform duration-200 lg:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}
      >
        <div className="flex h-20 items-center justify-between border-b px-6" style={{ borderColor: 'var(--border)' }}>
          <Link href="/dashboard" className="flex items-center gap-3" prefetch={true}>
            {settings.siteLogo ? (
              <img
                src={settings.siteLogo}
                alt={settings.siteName}
                className="h-12 w-auto max-h-12 max-w-[200px] object-contain rounded-xl"
                style={{ filter: 'var(--logo-filter, none)' }}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
                <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{settings.siteName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            {!settings.siteLogo && (
              <span className="text-lg font-bold">{settings.siteName}</span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl border p-2 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="sidebar-nav-icon-red space-y-2 p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
            prefetch={true}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/dashboard';
            }}
          >
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          {canSeeUsers && (
            <Link
              href="/dashboard/users"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/users';
              }}
            >
              <Users className="h-5 w-5" />
              <span>Users</span>
            </Link>
          )}
          {canSeeLocations && (
            <Link
              href="/dashboard/locations"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/locations';
              }}
            >
              <MapPin className="h-5 w-5" />
              <span>Locations</span>
            </Link>
          )}
          {canSeeUnits && (
            <Link
              href="/dashboard/units"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/units';
              }}
            >
              <Box className="h-5 w-5" />
              <span>Units</span>
            </Link>
          )}
          {canSeeClients && (
            <Link
              href="/dashboard/clients"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/clients';
              }}
            >
              <UserRound className="h-5 w-5" />
              <span>Clients</span>
            </Link>
          )}
          {canSeeContracts && (
            <Link
              href="/dashboard/contracts"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/contracts';
              }}
            >
              <FileSignature className="h-5 w-5" />
              <span>Contracts</span>
            </Link>
          )}
          {canSeeWordPress && (
            <Link
              href="/dashboard/wordpress"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/wordpress';
              }}
            >
              <Globe className="h-5 w-5" />
              <span>WordPress</span>
            </Link>
          )}
          {canSeeSettings && (
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition"
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/dashboard/settings';
              }}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[var(--sidebar-width)] min-h-screen overflow-x-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-end border-b px-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--surface-2)' }}>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="rounded-lg p-2 transition"
              style={{
                backgroundColor: theme === 'light' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'light' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Light mode"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark-standard')}
              className="rounded-lg p-2 transition"
              style={{
                backgroundColor: theme === 'dark-standard' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'dark-standard' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Dark standard"
              title="Dark (standard)"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark-red')}
              className="rounded-lg p-2 transition relative"
              style={{
                backgroundColor: theme === 'dark-red' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'dark-red' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Dark red"
              title="Dark (red accent)"
            >
              <Moon className="h-4 w-4" />
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark-emerald')}
              className="rounded-lg p-2 transition relative"
              style={{
                backgroundColor: theme === 'dark-emerald' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'dark-emerald' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Dark emerald"
              title="Dark (emerald accent)"
            >
              <Moon className="h-4 w-4" />
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className="rounded-lg p-2 transition"
              style={{
                backgroundColor: theme === 'system' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'system' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="System preference"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)', width: '100%' }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" style={{ color: 'var(--text-strong)' }} />
            </button>

            <Link href="/dashboard" className="flex items-center gap-2">
              {settings.siteLogo ? (
                <img
                  src={settings.siteLogo}
                  alt={settings.siteName}
                  className="h-10 w-auto max-h-10 max-w-[150px] object-contain rounded-lg"
                  style={{ filter: 'var(--logo-filter, none)' }}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--accent-soft)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{settings.siteName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              {!settings.siteLogo && (
                <span className="font-semibold">{settings.siteName}</span>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--surface-2)' }}>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="rounded-lg p-2 transition"
              style={{
                backgroundColor: theme === 'light' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'light' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Light mode"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark-standard')}
              className="rounded-lg p-2 transition"
              style={{
                backgroundColor: theme === 'dark-standard' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'dark-standard' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Dark standard"
              title="Dark (standard)"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark-red')}
              className="rounded-lg p-2 transition relative"
              style={{
                backgroundColor: theme === 'dark-red' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'dark-red' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Dark red"
              title="Dark (red accent)"
            >
              <Moon className="h-4 w-4" />
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark-emerald')}
              className="rounded-lg p-2 transition relative"
              style={{
                backgroundColor: theme === 'dark-emerald' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'dark-emerald' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="Dark emerald"
              title="Dark (emerald accent)"
            >
              <Moon className="h-4 w-4" />
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className="rounded-lg p-2 transition"
              style={{
                backgroundColor: theme === 'system' ? 'var(--surface-0)' : 'transparent',
                color: theme === 'system' ? 'var(--text-strong)' : 'var(--text-muted)',
              }}
              aria-label="System preference"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
        </header>
        
        <div className="px-4 py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
