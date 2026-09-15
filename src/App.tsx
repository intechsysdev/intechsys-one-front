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
import { useAuth } from './providers/AuthProvider'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="empresas" element={<TenantsPage />} />
          <Route path="empresas/:tenantId" element={<TenantDetailPage />} />
          <Route path="empresas/:tenantId/apps/:tenantAppId" element={<TenantAppPage />} />
          <Route path="apps" element={<AppsPage />} />
          <Route path="apps/:appId" element={<AppDetailPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="auditoria" element={<AuditPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
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
