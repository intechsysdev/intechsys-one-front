import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TenantsPage } from './pages/TenantsPage'
import { TenantDetailPage } from './pages/TenantDetailPage'
import { TenantAppPage } from './pages/TenantAppPage'
import { AppsPage } from './pages/AppsPage'
import { AppDetailPage } from './pages/AppDetailPage'
import { UsersPage } from './pages/UsersPage'
import { AuditPage } from './pages/AuditPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { MyAppsPage } from './pages/MyAppsPage'
import { AuthorizePage } from './pages/AuthorizePage'
import { useAuth } from './providers/AuthProvider'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        {/* Fuera del marco del portal: es un paso de paso hacia otra app, no una pantalla. */}
        <Route path="autorizar" element={<AuthorizePage />} />

        <Route element={<AppShell />}>
          <Route index element={<MyAppsPage />} />
          <Route path="perfil" element={<ProfilePage />} />

          {/* Gestión: solo para quien administra algo. Ocultar el menú no basta; alguien puede
              escribir la dirección, y el API ya le negaría los datos, pero la pantalla quedaría
              a medias con errores. */}
          <Route element={<RequireManager />}>
            <Route path="panel" element={<DashboardPage />} />
            <Route path="empresas" element={<TenantsPage />} />
            <Route path="empresas/:tenantId" element={<TenantDetailPage />} />
            <Route path="empresas/:tenantId/apps/:tenantAppId" element={<TenantAppPage />} />
            <Route path="apps" element={<AppsPage />} />
            <Route path="apps/:appId" element={<AppDetailPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="auditoria" element={<AuditPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

function RequireManager() {
  const { isManager } = useAuth()
  return isManager ? <Outlet /> : <Navigate to="/" replace />
}

function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sunken">
        <Loader2 className="size-6 animate-spin text-accent" aria-label="Cargando sesión" />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
