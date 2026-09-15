import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

const widths = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: keyof typeof widths
  /** Impide cerrar con Escape o clic fuera mientras hay una operación en curso. */
  locked?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
  locked,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !locked) onClose()
    }

    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // El foco entra en el diálogo para que el teclado no se quede detrás.
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]), textarea, select, button:not([data-close])',
      )
      focusable?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.clearTimeout(timer)
    }
  }, [open, onClose, locked])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
          <motion.div
            className="fixed inset-0 bg-[oklch(0.12_0.02_265/0.55)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !locked && onClose()}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={cn(
              'relative my-auto w-full rounded-2xl border border-line bg-overlay shadow-[var(--shadow-float)]',
              widths[width],
            )}
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
                {description && (
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                data-close
                onClick={onClose}
                disabled={locked}
                aria-label="Cerrar"
                className="-mr-1.5 -mt-0.5 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-inset hover:text-ink disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-line bg-inset/60 px-6 py-3.5">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="sm"
      locked={loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            tone === 'danger' ? 'bg-critical-soft text-critical' : 'bg-accent-soft text-accent',
          )}
        >
          <AlertTriangle className="size-4.5" />
        </div>
        <div className="pt-0.5 text-[0.875rem] leading-relaxed text-ink-soft">{description}</div>
      </div>
    </Modal>
  )
}
