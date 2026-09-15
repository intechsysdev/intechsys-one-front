import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 ' +
  'disabled:pointer-events-none disabled:opacity-45 active:translate-y-px select-none'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-contrast shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-accent-hover',
  secondary:
    'bg-inset text-ink border border-line hover:border-line-strong hover:bg-overlay',
  outline:
    'border border-line-strong text-ink hover:bg-inset',
  ghost: 'text-ink-soft hover:bg-inset hover:text-ink',
  danger: 'bg-critical text-white hover:brightness-110',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-9.5 px-4 text-sm',
  lg: 'h-11 px-5 text-[0.9375rem]',
  icon: 'size-9 p-0',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

export interface LinkButtonProps {
  to: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  className?: string
  children?: ReactNode
}

export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link to={to} className={cn(base, variants[variant], sizes[size], className)}>
      {icon}
      {children}
    </Link>
  )
}
