import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brass text-brass-ink hover:bg-brass-bright shadow-[0_1px_0_rgb(255_255_255/0.25)_inset]',
        secondary: 'border border-line-strong bg-surface text-bone hover:border-brass/60 hover:bg-surface-raised',
        ghost: 'text-moss hover:bg-surface hover:text-bone',
        danger: 'border border-seal/60 text-seal-soft hover:bg-seal hover:text-bone'
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-lg',
        icon: 'size-9'
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
)
