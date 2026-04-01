'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Sun, Moon, Monitor } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8" style={{ color: 'var(--text-strong)' }}>
      <div className="absolute right-4 top-4 flex items-center gap-1 rounded-xl p-1 sm:right-6 sm:top-6" style={{ backgroundColor: 'var(--surface-2)' }}>
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
          onClick={() => setTheme('dark')}
          className="rounded-lg p-2 transition"
          style={{
            backgroundColor: theme === 'dark' ? 'var(--surface-0)' : 'transparent',
            color: theme === 'dark' ? 'var(--text-strong)' : 'var(--text-muted)',
          }}
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
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

      <div className="max-w-md w-full space-y-8 rounded-[28px] border p-8 shadow-xl" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
        <div>
          <div className="flex justify-center">
            {settings.siteLogo ? (
              <img
                src={settings.siteLogo}
                alt={settings.siteName}
                className="h-24 w-auto max-h-24 max-w-[300px] object-contain rounded-2xl"
                style={{ filter: 'var(--logo-filter, none)' }}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
                <Lock className="h-10 w-10" style={{ color: 'var(--accent)' }} />
              </div>
            )}
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            {!settings.siteLogo && settings.siteName}
          </h2>
          {settings.siteDescription && (
            <p className="mt-2 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {settings.siteDescription}
            </p>
          )}
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))', borderColor: 'color-mix(in srgb, var(--danger) 40%, var(--border))', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div className="-space-y-px rounded-2xl shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-2xl border px-3 py-2 focus:z-10 focus:outline-none sm:text-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)', color: 'var(--text-strong)' }}
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-2xl border px-3 py-2 focus:z-10 focus:outline-none sm:text-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)', color: 'var(--text-strong)' }}
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
