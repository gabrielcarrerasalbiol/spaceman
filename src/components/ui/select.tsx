"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({ isOpen: false, setIsOpen: () => {} })

export function Select({ value, onValueChange, children, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className={`relative ${className}`}>{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 py-2 text-sm ${className}`}
      style={{ 
        borderColor: 'var(--border)', 
        backgroundColor: 'var(--surface-0)',
        color: 'var(--text-strong)'
      }}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={`absolute z-50 mt-1 w-full rounded-xl border p-1 shadow-lg ${className}`}
      style={{ 
        borderColor: 'var(--border)', 
        backgroundColor: 'var(--surface-0)'
      }}
    >
      {children}
    </div>
  )
}

export function SelectItem({ value, children, className = '' }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext)
  const isSelected = selectedValue === value

  return (
    <div
      onClick={() => {
        onValueChange?.(value)
        setIsOpen(false)
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none transition-colors ${className}`}
      style={{
        backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
        color: 'var(--text-strong)'
      }}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
          •
        </span>
      )}
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext)
  return <span style={{ color: value ? 'var(--text-strong)' : 'var(--text-muted)' }}>{value || placeholder}</span>
}
