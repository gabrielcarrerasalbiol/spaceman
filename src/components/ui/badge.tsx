"use client"

import * as React from "react"

type BadgeVariant = 'default' | 'secondary' | 'success' | 'danger' | 'warning'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--accent-soft)',
    color: 'var(--accent)',
  },
  secondary: {
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text-muted)',
  },
  success: {
    backgroundColor: 'color-mix(in srgb, var(--success) 16%, transparent)',
    color: 'var(--success)',
  },
  danger: {
    backgroundColor: 'color-mix(in srgb, var(--danger) 16%, transparent)',
    color: 'var(--danger)',
  },
  warning: {
    backgroundColor: 'color-mix(in srgb, var(--warning) 16%, transparent)',
    color: 'var(--warning)',
  },
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  )
}
