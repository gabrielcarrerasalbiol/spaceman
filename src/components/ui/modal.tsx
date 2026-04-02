'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn('relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl', className)}
        style={{ backgroundColor: 'var(--surface-0)', border: '1px solid var(--border)' }}
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between border-b px-6 py-4"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-1 transition hover:bg-[var(--surface-1)]"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
