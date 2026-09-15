import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { cn, copyToClipboard, environmentMeta, environments } from '@/lib/utils'
import type { AppEnvironment } from '@/lib/types'

// ── Pestañas ────────────────────────────────────────────────────────────────

export interface TabItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {items.map((item) => {
        const selected = item.id === active

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-2.5 text-[0.8438rem] font-medium whitespace-nowrap transition-colors',
              selected ? 'text-ink' : 'text-ink-muted hover:text-ink-soft',
            )}
          >
            {item.icon}
            {item.label}
            {item.badge}

            {selected && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Selector de entorno ─────────────────────────────────────────────────────

/**
 * El entorno es la decisión más peligrosa de esta consola: se muestra siempre
 * con su color y con producción visualmente separada del resto.
 */
export function EnvironmentPicker({
  value,
  onChange,
  className,
}: {
  value: AppEnvironment
  onChange: (environment: AppEnvironment) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-inset p-0.5',
        className,
      )}
      role="radiogroup"
      aria-label="Entorno"
    >
      {environments.map((environment) => {
        const meta = environmentMeta[environment]
        const selected = environment === value

        return (
          <button
            key={environment}
            type="button"
            role="radio"
            aria-checked={selected}
            title={meta.description}
            onClick={() => onChange(environment)}
            className={cn(
              'relative rounded-[0.4375rem] px-3 py-1.5 text-[0.7812rem] font-semibold tracking-wide transition-colors',
              selected ? 'text-ink' : 'text-ink-muted hover:text-ink-soft',
            )}
          >
            {selected && (
              <motion.span
                layoutId="environment-pill"
                className="absolute inset-0 rounded-[0.4375rem] border"
                style={{
                  backgroundColor: `color-mix(in oklch, ${meta.color} 16%, transparent)`,
                  borderColor: `color-mix(in oklch, ${meta.color} 40%, transparent)`,
                }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
              {meta.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function EnvironmentTag({
  environment,
  className,
}: {
  environment: AppEnvironment
  className?: string
}) {
  const meta = environmentMeta[environment]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-wide',
        className,
      )}
      style={{
        color: meta.color,
        backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)`,
        borderColor: `color-mix(in oklch, ${meta.color} 32%, transparent)`,
      }}
      title={meta.description}
    >
      {meta.short}
    </span>
  )
}

// ── Copiar al portapapeles ──────────────────────────────────────────────────

export function CopyButton({
  value,
  label = 'Copiar',
  className,
  size = 'icon',
}: {
  value: string
  label?: string
  className?: string
  size?: 'icon' | 'inline'
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handleCopy = async () => {
    if (!(await copyToClipboard(value))) return

    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={copied ? 'Copiado' : label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md text-ink-muted transition-colors hover:bg-inset hover:text-ink',
        size === 'icon' ? 'size-7 justify-center' : 'px-2 py-1 text-[0.75rem]',
        copied && 'text-positive',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'done' : 'idle'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.12 }}
          className="flex items-center"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </motion.span>
      </AnimatePresence>
      {size === 'inline' && (copied ? 'Copiado' : label)}
    </button>
  )
}

// ── Valor monoespaciado con copia ───────────────────────────────────────────

export function MonoValue({
  value,
  copyValue,
  className,
  tone = 'default',
}: {
  value: ReactNode
  copyValue?: string
  className?: string
  tone?: 'default' | 'muted'
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-inset px-2 py-0.5 font-mono text-[0.75rem]',
        tone === 'muted' ? 'text-ink-muted' : 'text-ink-soft',
        className,
      )}
    >
      <span className="truncate">{value}</span>
      {copyValue && <CopyButton value={copyValue} className="-mr-1 size-6 shrink-0" />}
    </span>
  )
}

// ── Campo secreto ───────────────────────────────────────────────────────────

/**
 * Los valores secretos nacen ocultos. Revelar dispara una llamada al API que
 * queda registrada en la auditoría, por eso es una acción explícita.
 */
export function SecretValue({
  masked,
  onReveal,
  className,
}: {
  masked: string
  onReveal: () => Promise<string | null>
  className?: string
}) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (revealed !== null) {
      setRevealed(null)
      return
    }

    setLoading(true)
    try {
      setRevealed((await onReveal()) ?? '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-inset px-2 py-0.5 font-mono text-[0.75rem] text-ink-soft',
        className,
      )}
    >
      <span className="truncate">{revealed ?? masked}</span>

      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={revealed === null ? 'Revelar valor' : 'Ocultar valor'}
        className="flex size-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
      >
        {revealed === null ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      </button>

      {revealed && <CopyButton value={revealed} className="-mr-1 size-6 shrink-0" />}
    </span>
  )
}

// ── Menú contextual ─────────────────────────────────────────────────────────

export function DropdownMenu({
  trigger,
  children,
  align = 'end',
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute z-40 mt-1.5 min-w-52 overflow-hidden rounded-xl border border-line bg-overlay p-1 shadow-[var(--shadow-float)]',
              align === 'end' ? 'right-0' : 'left-0',
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  tone = 'default',
  disabled,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] transition-colors disabled:pointer-events-none disabled:opacity-45',
        tone === 'danger'
          ? 'text-critical hover:bg-critical-soft'
          : 'text-ink-soft hover:bg-inset hover:text-ink',
      )}
    >
      {icon && <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </button>
  )
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" role="separator" />
}
