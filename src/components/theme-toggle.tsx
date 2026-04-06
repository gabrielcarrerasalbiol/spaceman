'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [showDarkVariants, setShowDarkVariants] = useState(false);

  const isDark = theme !== 'light' && theme !== 'system';
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && !window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1 rounded-xl p-1"
        style={{ backgroundColor: 'var(--surface-2)' }}
      >
        <button
          onClick={() => {
            setTheme('light');
            setShowDarkVariants(false);
          }}
          className="rounded-lg p-2 transition"
          style={{
            backgroundColor: isLight ? 'var(--surface-0)' : 'transparent',
            color: isLight ? 'var(--text-strong)' : 'var(--text-muted)',
          }}
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowDarkVariants(!showDarkVariants)}
          className="rounded-lg p-2 transition relative"
          style={{
            backgroundColor: isDark ? 'var(--surface-0)' : 'transparent',
            color: isDark ? 'var(--text-strong)' : 'var(--text-muted)',
          }}
          aria-label="Dark mode variants"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setTheme('system');
            setShowDarkVariants(false);
          }}
          className="rounded-lg p-2 transition"
          style={{
            backgroundColor: theme === 'system' && !isDark ? 'var(--surface-0)' : 'transparent',
            color: theme === 'system' && !isDark ? 'var(--text-strong)' : 'var(--text-muted)',
          }}
          aria-label="System preference"
        >
          <Monitor className="h-4 w-4" />
        </button>
      </div>

      {showDarkVariants && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl border shadow-lg overflow-hidden min-w-[200px]"
          style={{
            backgroundColor: 'var(--surface-0)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 px-2 py-1" style={{ color: 'var(--text-muted)' }}>
              <Palette className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Dark Themes</span>
            </div>
          </div>
          <button
            onClick={() => {
              setTheme('dark-standard');
              setShowDarkVariants(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 transition hover:bg-opacity-80 text-left"
            style={{ color: 'var(--text-strong)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#3b82f6' }}
            >
              <Moon className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-medium text-sm">Standard</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Blue-based dark theme</div>
            </div>
          </button>
          <button
            onClick={() => {
              setTheme('dark-red');
              setShowDarkVariants(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 transition hover:bg-opacity-80 text-left"
            style={{ color: 'var(--text-strong)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Moon className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-medium text-sm">Red</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Red-based dark theme</div>
            </div>
          </button>
          <button
            onClick={() => {
              setTheme('dark-emerald');
              setShowDarkVariants(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 transition hover:bg-opacity-80 text-left"
            style={{ color: 'var(--text-strong)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#10b981' }}
            >
              <Moon className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-medium text-sm">Emerald</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Green-based dark theme</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
