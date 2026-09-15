import { NavLink } from 'react-router-dom'
import {
  Blocks,
  Building2,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Settings2,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'

interface NavEntry {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  adminOnly?: boolean
}

const sections: { title: string; entries: NavEntry[] }[] = [
  {
    title: 'Operación',
    entries: [
      { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
      { to: '/empresas', label: 'Empresas', icon: Building2 },
      { to: '/apps', label: 'Catálogo de apps', icon: Blocks },
    ],
  },
  {
    title: 'Administración',
    entries: [
      { to: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
      { to: '/auditoria', label: 'Auditoría', icon: ScrollText, adminOnly: true },
      { to: '/perfil', label: 'Mi cuenta', icon: Settings2 },
    ],
  },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const isSupport = user?.roles.includes('PlatformSupport') ?? false
  const canSeeAdmin = (user?.isPlatformAdmin ?? false) || isSupport

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4" aria-label="Principal">
      <BrandMark />

      <div className="flex flex-1 flex-col gap-6">
        {sections.map((section) => {
          const entries = section.entries.filter((entry) => !entry.adminOnly || canSeeAdmin)
          if (entries.length === 0) return null

          return (
            <div key={section.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                {section.title}
              </p>

              {entries.map((entry) => (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  end={entry.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8438rem] font-medium transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-ink-soft hover:bg-inset hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'absolute left-0 h-5 w-0.5 rounded-r-full bg-accent transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden
                      />
                      <entry.icon className="size-4.5 shrink-0" aria-hidden />
                      {entry.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </div>

      <IntegrationHint />
    </nav>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1">
      <span className="relative flex size-8 items-center justify-center rounded-[0.625rem] bg-gradient-to-br from-accent to-info shadow-[0_2px_8px_-2px_var(--accent)]">
        <span className="size-3 rounded-full border-2 border-[var(--accent-contrast)]" />
      </span>

      <span className="flex flex-col leading-none">
        <span className="text-[0.9375rem] font-semibold tracking-tight text-ink">One</span>
        <span className="mt-0.5 text-[0.6875rem] text-ink-muted">Consola de configuración</span>
      </span>
    </div>
  )
}

/** Recordatorio permanente de para qué sirve la consola: emitir accesos a las apps. */
function IntegrationHint() {
  return (
    <div className="rounded-xl border border-line bg-inset/60 p-3.5">
      <div className="flex items-center gap-2 text-ink-soft">
        <KeyRound className="size-4 text-accent" aria-hidden />
        <span className="text-[0.8125rem] font-medium">Integración</span>
      </div>

      <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-muted">
        Las apps leen su configuración con{' '}
        <code className="rounded bg-base px-1 py-0.5 font-mono text-[0.6875rem] text-ink-soft">
          GET /api/v1/integration/config
        </code>{' '}
        usando su api key y secreto.
      </p>
    </div>
  )
}
