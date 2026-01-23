import * as Menu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Dropdown = Menu.Root
export const DropdownTrigger = Menu.Trigger

export function DropdownContent({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className="z-50 min-w-48 rounded-control border border-line bg-surface-raised p-1 shadow-raised"
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  )
}

export function DropdownItem({ children, onSelect, danger }: { children: ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-[0.35rem] px-2.5 py-2 text-sm outline-none select-none [&_svg]:size-4',
        danger ? 'text-seal-soft data-[highlighted]:bg-seal data-[highlighted]:text-bone' : 'data-[highlighted]:bg-felt-deep'
      )}
    >
      {children}
    </Menu.Item>
  )
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-2.5 pt-1.5 pb-1 text-xs text-moss-dim">{children}</Menu.Label>
}

export const DropdownSeparator = () => <Menu.Separator className="my-1 h-px bg-line" />
