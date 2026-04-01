"use client"

import * as React from "react"

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  defaultValue: string
  children: React.ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div 
      className={`flex space-x-1 rounded-xl p-1 ${className}`}
      style={{ backgroundColor: 'var(--surface-2)' }}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = context.activeTab === value

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${className}`}
      style={{
        backgroundColor: isActive ? 'var(--surface-0)' : 'transparent',
        color: isActive ? 'var(--text-strong)' : 'var(--text-muted)',
        boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.activeTab !== value) return null

  return <div className={className}>{children}</div>
}
