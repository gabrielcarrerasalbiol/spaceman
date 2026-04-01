'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div 
      className="flex items-center gap-1 rounded-xl p-1"
      style={{ backgroundColor: 'var(--surface-2)' }}
    >
      <button
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
  );
}
