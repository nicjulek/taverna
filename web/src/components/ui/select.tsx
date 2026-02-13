import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SelectProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Select<T extends string>({ value, onChange, options, label, className, disabled, size = 'md' }: SelectProps<T>) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-between gap-2 rounded-control border border-line-strong bg-felt-deep px-3 text-left text-bone hover:border-moss-dim focus-visible:border-brass disabled:opacity-60',
          size === 'sm' ? 'h-8 text-sm' : 'h-10',
          className
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-moss" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-control border border-line bg-surface-raised shadow-raised"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center rounded-[0.35rem] py-1.5 pr-3 pl-8 text-sm outline-none select-none data-[highlighted]:bg-brass data-[highlighted]:text-brass-ink"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
