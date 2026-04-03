"use client"

import * as React from "react"

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className = '' }: TableProps) {
  return <thead className={`[&_tr]:border-b ${className}`}>{children}</thead>
}

export function TableBody({ children, className = '' }: TableProps) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
}

export function TableRow({ children, className = '', ...props }: TableRowProps) {
  return (
    <tr 
      className={`border-b transition-colors hover:bg-[var(--surface-1)] ${className}`}
      style={{ borderColor: 'var(--border)' }}
      {...props}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

export function TableHead({ children, className = '', ...props }: TableHeadProps) {
  return (
    <th 
      className={`h-12 px-4 text-left align-middle font-medium ${className}`}
      style={{ color: 'var(--text-muted)' }}
      {...props}
    >
      {children}
    </th>
  )
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

export function TableCell({ children, className = '', ...props }: TableCellProps) {
  return (
    <td className={`p-4 align-middle ${className}`} style={{ color: 'var(--text-strong)' }} {...props}>
      {children}
    </td>
  )
}
