import type { ReactNode } from 'react'
import { cn, initials, type BadgeTone } from '@/lib/utils'

// ── Tarjeta ─────────────────────────────────────────────────────────────────

export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string
  children: ReactNode
  padded?: boolean
}) {
  return (
    <section className={cn('surface-card', padded && 'p-5', className)}>{children}</section>
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-ink">{title}</h2>
        {description && (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}

// ── Distintivo ──────────────────────────────────────────────────────────────

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-inset text-ink-soft border-line',
  accent: 'bg-accent-soft text-accent border-accent-border',
  positive: 'bg-positive-soft text-positive border-transparent',
  caution: 'bg-caution-soft text-caution border-transparent',
  critical: 'bg-critical-soft text-critical border-transparent',
  info: 'bg-info-soft text-info border-transparent',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.7188rem] font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────

const avatarSizes = {
  sm: 'size-7 text-[0.6875rem]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-lg',
}

export function Avatar({
  name,
  src,
  color,
  size = 'md',
  className,
  square,
}: {
  name?: string | null
  src?: string | null
  color?: string | null
  size?: keyof typeof avatarSizes
  className?: string
  square?: boolean
}) {
  const shape = square ? 'rounded-lg' : 'rounded-full'

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={cn('shrink-0 border border-line object-cover', shape, avatarSizes[size], className)}
      />
    )
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center border font-semibold tracking-tight',
        shape,
        avatarSizes[size],
        className,
      )}
      style={
        color
          ? { backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)`, color, borderColor: `color-mix(in oklch, ${color} 35%, transparent)` }
          : undefined
      }
      aria-hidden
    >
      {!color && (
        <span className="flex size-full items-center justify-center rounded-[inherit] bg-accent-soft text-accent">
          {initials(name)}
        </span>
      )}
      {color && initials(name)}
    </span>
  )
}

// ── Esqueletos ──────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-px" aria-label="Cargando" aria-busy>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-4', columnIndex === 0 ? 'w-2/5' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Estado vacío ────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 overflow-hidden px-6 py-14 text-center',
        className,
      )}
    >
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" aria-hidden />

      {icon && (
        <div className="relative flex size-12 items-center justify-center rounded-xl border border-line bg-inset text-ink-muted">
          {icon}
        </div>
      )}

      <div className="relative max-w-sm">
        <h3 className="text-[0.9375rem] font-semibold text-ink">{title}</h3>
        {description && (
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>

      {action && <div className="relative mt-1">{action}</div>}
    </div>
  )
}

// ── Cabecera de página ──────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 flex items-center gap-2 text-[0.75rem] font-medium text-ink-muted">
              {eyebrow}
            </div>
          )}
          <h1 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[0.8438rem] leading-relaxed text-ink-muted">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

// ── Separador con título ────────────────────────────────────────────────────

export function SectionDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-muted uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
