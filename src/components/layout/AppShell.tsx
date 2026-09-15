import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { LogOut, Menu, Moon, Search, Sun, UserRound, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { Avatar } from '@/components/ui/Primitives'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/Controls'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  // Atajo global: ⌘K / Ctrl+K abre la paleta desde cualquier pantalla.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => setMobileNavOpen(false), [location.pathname])

  return (
    <div className="app-canvas min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-70 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-accent-contrast"
      >
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) border-r border-line bg-base/80 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[oklch(0.12_0.02_265/0.5)] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 z-50 w-(--sidebar-width) border-r border-line bg-base lg:hidden"
          >
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </motion.aside>
        </>
      )}

      <div className="lg:pl-(--sidebar-width)">
        <Topbar
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleNav={() => setMobileNavOpen((open) => !open)}
          mobileNavOpen={mobileNavOpen}
        />

        <main id="contenido" className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function Topbar({
  onOpenPalette,
  onToggleNav,
  mobileNavOpen,
}: {
  onOpenPalette: () => void
  onToggleNav: () => void
  mobileNavOpen: boolean
}) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 flex h-(--topbar-height) items-center gap-3 border-b border-line bg-base/75 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onToggleNav}
        aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
        className="-ml-1 rounded-lg p-2 text-ink-soft transition-colors hover:bg-inset lg:hidden"
      >
        {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <button
        type="button"
        onClick={onOpenPalette}
        className={cn(
          'group flex h-9 flex-1 items-center gap-2.5 rounded-lg border border-line bg-inset/70 px-3 text-left transition-colors',
          'hover:border-line-strong hover:bg-inset sm:max-w-sm',
        )}
      >
        <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <span className="flex-1 truncate text-[0.8438rem] text-ink-muted">Buscar o ejecutar…</span>
        <kbd className="hidden shrink-0 rounded border border-line bg-base px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-muted sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
          className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-inset hover:text-ink"
        >
          {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
        </button>

        <DropdownMenu
          trigger={({ toggle: toggleMenu }) => (
            <button
              type="button"
              onClick={toggleMenu}
              className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-inset"
            >
              <Avatar name={user?.fullName} src={user?.avatarUrl} size="sm" />
              <span className="hidden max-w-36 truncate text-[0.8125rem] font-medium text-ink sm:block">
                {user?.firstName}
              </span>
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-2.5 py-2">
                <p className="truncate text-[0.8125rem] font-medium text-ink">{user?.fullName}</p>
                <p className="truncate text-[0.75rem] text-ink-muted">{user?.email}</p>
              </div>

              <MenuSeparator />

              <MenuItem
                icon={<UserRound className="size-4" />}
                onClick={() => {
                  close()
                  navigate('/perfil')
                }}
              >
                Mi cuenta
              </MenuItem>

              <MenuItem
                tone="danger"
                icon={<LogOut className="size-4" />}
                onClick={() => {
                  close()
                  void logout()
                }}
              >
                Cerrar sesión
              </MenuItem>
            </>
          )}
        </DropdownMenu>
      </div>
    </header>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Ruta" className="flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && <span aria-hidden>/</span>}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-soft">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
