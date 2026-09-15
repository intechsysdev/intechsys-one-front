import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Blocks,
  Building2,
  CornerDownLeft,
  LayoutDashboard,
  Moon,
  Plus,
  ScrollText,
  Search,
  Settings2,
  Sun,
  Users,
} from 'lucide-react'
import { useTenants } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/ThemeProvider'
import { useAuth } from '@/providers/AuthProvider'

interface Command {
  id: string
  label: string
  hint?: string
  group: string
  icon: typeof Search
  run: () => void
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const listRef = useRef<HTMLDivElement>(null)

  // Solo se consultan empresas mientras la paleta está abierta y hay texto.
  const { data: tenants } = useTenants({ page: 1, pageSize: 6, search: query || undefined })

  const commands = useMemo<Command[]>(() => {
    const navigation: Command[] = [
      { id: 'nav-dashboard', label: 'Ir al panel', group: 'Navegación', icon: LayoutDashboard, run: () => navigate('/') },
      { id: 'nav-tenants', label: 'Ir a empresas', group: 'Navegación', icon: Building2, run: () => navigate('/empresas') },
      { id: 'nav-apps', label: 'Ir al catálogo de apps', group: 'Navegación', icon: Blocks, run: () => navigate('/apps') },
      { id: 'nav-profile', label: 'Ir a mi cuenta', group: 'Navegación', icon: Settings2, run: () => navigate('/perfil') },
    ]

    if (user?.isPlatformAdmin) {
      navigation.push(
        { id: 'nav-users', label: 'Ir a usuarios', group: 'Navegación', icon: Users, run: () => navigate('/usuarios') },
        { id: 'nav-audit', label: 'Ir a auditoría', group: 'Navegación', icon: ScrollText, run: () => navigate('/auditoria') },
        { id: 'new-tenant', label: 'Crear empresa', hint: 'Nueva', group: 'Acciones', icon: Plus, run: () => navigate('/empresas?nueva=1') },
        { id: 'new-app', label: 'Registrar app', hint: 'Nueva', group: 'Acciones', icon: Plus, run: () => navigate('/apps?nueva=1') },
      )
    }

    navigation.push({
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
      group: 'Acciones',
      icon: theme === 'dark' ? Sun : Moon,
      run: toggle,
    })

    const tenantCommands: Command[] =
      tenants?.items.map((tenant) => ({
        id: `tenant-${tenant.id}`,
        label: tenant.name,
        hint: tenant.slug,
        group: 'Empresas',
        icon: Building2,
        run: () => navigate(`/empresas/${tenant.id}`),
      })) ?? []

    return [...navigation, ...tenantCommands]
  }, [navigate, theme, toggle, tenants, user])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return commands

    return commands.filter((command) =>
      `${command.label} ${command.hint ?? ''} ${command.group}`.toLowerCase().includes(term),
    )
  }, [commands, query])

  useEffect(() => setHighlighted(0), [query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlighted((index) => (index + 1) % Math.max(filtered.length, 1))
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlighted((index) => (index - 1 + filtered.length) % Math.max(filtered.length, 1))
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const command = filtered[highlighted]

        if (command) {
          command.run()
          onClose()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, filtered, highlighted, onClose])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  let lastGroup = ''

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            className="fixed inset-0 bg-[oklch(0.12_0.02_265/0.5)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-overlay shadow-[var(--shadow-float)]"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar empresas, páginas o acciones…"
                className="h-12 w-full bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-muted"
              />
              <kbd className="shrink-0 rounded border border-line bg-inset px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-muted">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-[0.8438rem] text-ink-muted">
                  Sin resultados para “{query}”.
                </p>
              ) : (
                filtered.map((command, index) => {
                  const showGroup = command.group !== lastGroup
                  lastGroup = command.group

                  return (
                    <div key={command.id}>
                      {showGroup && (
                        <p className="px-3 pt-3 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                          {command.group}
                        </p>
                      )}

                      <button
                        type="button"
                        data-index={index}
                        onMouseEnter={() => setHighlighted(index)}
                        onClick={() => {
                          command.run()
                          onClose()
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[0.8438rem] transition-colors',
                          index === highlighted
                            ? 'bg-accent-soft text-accent'
                            : 'text-ink-soft hover:bg-inset',
                        )}
                      >
                        <command.icon className="size-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{command.label}</span>
                        {command.hint && (
                          <span className="shrink-0 font-mono text-[0.6875rem] text-ink-muted">
                            {command.hint}
                          </span>
                        )}
                        {index === highlighted && (
                          <CornerDownLeft className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
