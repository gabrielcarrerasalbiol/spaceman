'use client';

import * as React from 'react';

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined);

function useCollapsibleContext() {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible components must be used within a Collapsible.Root');
  }
  return context;
}

namespace Collapsible {
  export interface RootProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
  }

  export function Root({ open: controlledOpen, onOpenChange, children, className }: RootProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const handleOpenChange = React.useCallback(
      (value: boolean) => {
        if (controlledOpen === undefined) {
          setInternalOpen(value);
        }
        onOpenChange?.(value);
      },
      [controlledOpen, onOpenChange]
    );

    return (
      <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
        <div className={className}>{children}</div>
      </CollapsibleContext.Provider>
    );
  }

  export interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
  }

  export function Trigger({ asChild, children, ...props }: TriggerProps) {
    const { open, onOpenChange } = useCollapsibleContext();

    return (
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        {...props}
      >
        {children}
      </button>
    );
  }

  export interface ContentProps {
    children: React.ReactNode;
    className?: string;
  }

  export function Content({ children, className }: ContentProps) {
    const { open } = useCollapsibleContext();

    if (!open) return null;

    return <div className={className}>{children}</div>;
  }
}

export default Collapsible;
