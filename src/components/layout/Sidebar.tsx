import { NavLink } from 'react-router-dom'
import {
  AppWindow,
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
  /** Visible también para quien solo es miembro. El resto del menú es de gestión. */
  everyone?: boolean
}

const sections: { title: string; entries: NavEntry[] }[] = [
  {
    title: 'Operación',
    entries: [
      { to: '/', label: 'Mis aplicaciones', icon: AppWindow, end: true, everyone: true },
      { to: '/panel', label: 'Panel', icon: LayoutDashboard },
      { to: '/empresas', label: 'Empresas', icon: Building2 },
      { to: '/apps', label: 'Catálogo de apps', icon: Blocks },
    ],
  },
  {
    title: 'Administración',
    entries: [
      { to: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
      { to: '/auditoria', label: 'Auditoría', icon: ScrollText, adminOnly: true },
      { to: '/perfil', label: 'Mi cuenta', icon: Settings2, everyone: true },
    ],
  },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isManager } = useAuth()
  // Usuarios y auditoría son del administrador de plataforma; soporte opera, no administra.
  const canSeeAdmin = user?.isPlatformAdmin ?? false

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4" aria-label="Principal">
      <BrandMark />

      <div className="flex flex-1 flex-col gap-6">
        {sections.map((section) => {
          const entries = section.entries.filter((entry) =>
            isManager ? !entry.adminOnly || canSeeAdmin : entry.everyone,
          )
          if (entries.length === 0) return null

          return (
            <div key={section.title} className="flex flex-col gap-1">
              {/* Con solo dos entradas los títulos sobran, y "Administración" sobre "Mi cuenta"
                  confundiría a quien no administra nada: el título va solo si la sección tiene
                  algo más que lo de todos. */}
              {isManager && entries.some((entry) => !entry.everyone) && (
                <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  {section.title}
                </p>
              )}

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

      {/* Es una nota técnica para quien integra apps; a un usuario final no le dice nada. */}
      {isManager && <IntegrationHint />}
    </nav>
  )
}

/** Marca compacta de INTECHSYS ONE; el logo ya dice "one", al lado solo va qué es la consola. */
function BrandMark() {
  return (
    <div className="flex items-center gap-3 px-3 py-1">
      <img src="/marca/marca.svg" alt="INTECHSYS ONE" width={29} height={40} className="marca-clara h-10 w-auto shrink-0" />
      <img src="/marca/marca-oscuro.svg" alt="INTECHSYS ONE" width={29} height={40} className="marca-oscura h-10 w-auto shrink-0" />

      <span className="text-[0.8125rem] leading-tight font-semibold text-ink">Consola de configuración</span>
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
