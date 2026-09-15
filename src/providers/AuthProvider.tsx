import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setSessionExpiredHandler, tokenStore } from '@/lib/api'
import type { AuthResponse, CurrentUser, TenantRole } from '@/lib/types'

interface AuthContextValue {
  user: CurrentUser | null
  status: 'loading' | 'authenticated' | 'anonymous'
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  /** Rol del usuario en la empresa indicada, o null si no pertenece a ella. */
  roleIn: (tenantId: string) => TenantRole | null
  canManageTenant: (tenantId: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const queryClient = useQueryClient()

  const clearSession = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSessionExpiredHandler(clearSession)
  }, [clearSession])

  // Rehidratación al abrir la aplicación: el token vive en localStorage,
  // pero la identidad siempre se vuelve a pedir al API.
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      if (!tokenStore.access && !tokenStore.refresh) {
        setStatus('anonymous')
        return
      }

      try {
        const me = await api.get<CurrentUser>('/auth/me')
        if (cancelled) return

        setUser(me)
        setStatus('authenticated')
      } catch {
        if (!cancelled) clearSession()
      }
    }

    void restore()

    return () => {
      cancelled = true
    }
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const auth = await api.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { anonymous: true },
    )

    tokenStore.save(auth)
    setUser(auth.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh

    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {
      // Cerrar sesión en el cliente no debe depender de que el API responda.
    }

    clearSession()
  }, [clearSession])

  const refreshUser = useCallback(async () => {
    setUser(await api.get<CurrentUser>('/auth/me'))
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const roleIn = (tenantId: string) =>
      user?.memberships.find((membership) => membership.tenantId === tenantId)?.role ?? null

    return {
      user,
      status,
      login,
      logout,
      refreshUser,
      roleIn,
      canManageTenant: (tenantId: string) => {
        if (user?.isPlatformAdmin) return true
        const role = roleIn(tenantId)
        return role === 'Owner' || role === 'Admin'
      },
    }
  }, [user, status, login, logout, refreshUser])

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return context
}
