import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  ApiCredential,
  ApiCredentialSecret,
  AppDetail,
  AppEnvironment,
  AppSummary,
  AuditLog,
  DashboardStats,
  Paged,
  Role,
  Tenant,
  TenantApp,
  TenantAppDetail,
  TenantAppSetting,
  TenantListItem,
  TenantMember,
  UserDetail,
  UserListItem,
} from './types'

/** Claves de caché centralizadas para poder invalidar por prefijo. */
export const keys = {
  dashboard: ['dashboard'] as const,
  auditLogs: (params: unknown) => ['audit-logs', params] as const,

  tenants: (params: unknown) => ['tenants', params] as const,
  tenant: (id: string) => ['tenant', id] as const,
  tenantMembers: (id: string) => ['tenant', id, 'members'] as const,
  tenantApps: (id: string) => ['tenant', id, 'apps'] as const,
  tenantApp: (tenantId: string, tenantAppId: string) =>
    ['tenant', tenantId, 'apps', tenantAppId] as const,
  tenantAppSettings: (tenantId: string, tenantAppId: string, environment: AppEnvironment) =>
    ['tenant', tenantId, 'apps', tenantAppId, 'settings', environment] as const,
  tenantAppCredentials: (tenantId: string, tenantAppId: string) =>
    ['tenant', tenantId, 'apps', tenantAppId, 'credentials'] as const,

  apps: (params: unknown) => ['apps', params] as const,
  app: (id: string) => ['app', id] as const,
  appCategories: ['app-categories'] as const,

  users: (params: unknown) => ['users', params] as const,
  user: (id: string) => ['user', id] as const,
  roles: ['roles'] as const,
}

export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  descending?: boolean
}

// ── Panel ───────────────────────────────────────────────────────────────────

/** Solo la plataforma puede leer las métricas globales; el resto recibiría un 403. */
export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api.get<DashboardStats>('/dashboard'),
    staleTime: 30_000,
    enabled,
  })
}

export function useAuditLogs(params: ListParams & { tenantId?: string; action?: string }) {
  return useQuery({
    queryKey: keys.auditLogs(params),
    queryFn: () => api.get<Paged<AuditLog>>('/audit-logs', { query: { ...params } }),
    placeholderData: (previous) => previous,
  })
}

// ── Empresas ────────────────────────────────────────────────────────────────

export function useTenants(params: ListParams & { status?: string }) {
  return useQuery({
    queryKey: keys.tenants(params),
    queryFn: () => api.get<Paged<TenantListItem>>('/tenants', { query: { ...params } }),
    placeholderData: (previous) => previous,
  })
}

export function useTenant(id?: string) {
  return useQuery({
    queryKey: keys.tenant(id ?? ''),
    queryFn: () => api.get<Tenant>(`/tenants/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateTenant() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Tenant>('/tenants', body),
    onSuccess: () => invalidateTenantLists(client),
  })
}

export function useUpdateTenant(id: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<Tenant>(`/tenants/${id}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tenant(id) })
      invalidateTenantLists(client)
    },
  })
}

export function useDeleteTenant() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tenants/${id}`),
    onSuccess: () => invalidateTenantLists(client),
  })
}

export function useTenantMembers(tenantId?: string) {
  return useQuery({
    queryKey: keys.tenantMembers(tenantId ?? ''),
    queryFn: () => api.get<TenantMember[]>(`/tenants/${tenantId}/members`),
    enabled: Boolean(tenantId),
  })
}

export function useAddTenantMember(tenantId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: { userId: string; role: string; isDefault?: boolean }) =>
      api.post<TenantMember>(`/tenants/${tenantId}/members`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tenantMembers(tenantId) })
      void client.invalidateQueries({ queryKey: keys.tenant(tenantId) })
    },
  })
}

export function useUpdateTenantMember(tenantId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ membershipId, ...body }: { membershipId: string; role: string; isActive: boolean; isDefault: boolean }) =>
      api.put<TenantMember>(`/tenants/${tenantId}/members/${membershipId}`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.tenantMembers(tenantId) }),
  })
}

export function useRemoveTenantMember(tenantId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (membershipId: string) =>
      api.delete<void>(`/tenants/${tenantId}/members/${membershipId}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tenantMembers(tenantId) })
      void client.invalidateQueries({ queryKey: keys.tenant(tenantId) })
    },
  })
}

// ── Apps de una empresa ─────────────────────────────────────────────────────

export function useTenantApps(tenantId?: string) {
  return useQuery({
    queryKey: keys.tenantApps(tenantId ?? ''),
    queryFn: () => api.get<TenantApp[]>(`/tenants/${tenantId}/apps`),
    enabled: Boolean(tenantId),
  })
}

export function useTenantApp(tenantId?: string, tenantAppId?: string) {
  return useQuery({
    queryKey: keys.tenantApp(tenantId ?? '', tenantAppId ?? ''),
    queryFn: () => api.get<TenantAppDetail>(`/tenants/${tenantId}/apps/${tenantAppId}`),
    enabled: Boolean(tenantId && tenantAppId),
  })
}

export function useAssignApp(tenantId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<TenantApp>(`/tenants/${tenantId}/apps`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tenantApps(tenantId) })
      void client.invalidateQueries({ queryKey: keys.tenant(tenantId) })
      void client.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useUpdateTenantApp(tenantId: string, tenantAppId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.put<TenantApp>(`/tenants/${tenantId}/apps/${tenantAppId}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tenantApp(tenantId, tenantAppId) })
      void client.invalidateQueries({ queryKey: keys.tenantApps(tenantId) })
    },
  })
}

export function useRemoveTenantApp(tenantId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (tenantAppId: string) =>
      api.delete<void>(`/tenants/${tenantId}/apps/${tenantAppId}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tenantApps(tenantId) })
      void client.invalidateQueries({ queryKey: keys.tenant(tenantId) })
    },
  })
}

// ── Variables ───────────────────────────────────────────────────────────────

export function useSettings(tenantId: string, tenantAppId: string, environment: AppEnvironment) {
  return useQuery({
    queryKey: keys.tenantAppSettings(tenantId, tenantAppId, environment),
    queryFn: () =>
      api.get<TenantAppSetting[]>(`/tenants/${tenantId}/apps/${tenantAppId}/settings`, {
        query: { environment },
      }),
    enabled: Boolean(tenantId && tenantAppId),
  })
}

export function useSaveSettings(tenantId: string, tenantAppId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: { environment: AppEnvironment; settings: unknown[] }) =>
      api.put<TenantAppSetting[]>(`/tenants/${tenantId}/apps/${tenantAppId}/settings/bulk`, body),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({
        queryKey: keys.tenantAppSettings(tenantId, tenantAppId, variables.environment),
      })
      void client.invalidateQueries({ queryKey: keys.tenantApp(tenantId, tenantAppId) })
      void client.invalidateQueries({ queryKey: keys.tenantApps(tenantId) })
    },
  })
}

export function useDeleteSetting(tenantId: string, tenantAppId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (settingId: string) =>
      api.delete<void>(`/tenants/${tenantId}/apps/${tenantAppId}/settings/${settingId}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['tenant', tenantId, 'apps', tenantAppId] })
    },
  })
}

export function revealSetting(tenantId: string, tenantAppId: string, settingId: string) {
  return api.get<{ value: string | null }>(
    `/tenants/${tenantId}/apps/${tenantAppId}/settings/${settingId}/reveal`,
  )
}

// ── Credenciales ────────────────────────────────────────────────────────────

export function useCredentials(tenantId: string, tenantAppId: string) {
  return useQuery({
    queryKey: keys.tenantAppCredentials(tenantId, tenantAppId),
    queryFn: () => api.get<ApiCredential[]>(`/tenants/${tenantId}/apps/${tenantAppId}/credentials`),
    enabled: Boolean(tenantId && tenantAppId),
  })
}

function invalidateCredentials(client: QueryClient, tenantId: string, tenantAppId: string) {
  void client.invalidateQueries({ queryKey: keys.tenantAppCredentials(tenantId, tenantAppId) })
  void client.invalidateQueries({ queryKey: keys.tenantApp(tenantId, tenantAppId) })
  void client.invalidateQueries({ queryKey: keys.tenantApps(tenantId) })
  void client.invalidateQueries({ queryKey: keys.dashboard })
}

export function useCreateCredential(tenantId: string, tenantAppId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<ApiCredentialSecret>(`/tenants/${tenantId}/apps/${tenantAppId}/credentials`, body),
    onSuccess: () => invalidateCredentials(client, tenantId, tenantAppId),
  })
}

export function useRotateCredential(tenantId: string, tenantAppId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (credentialId: string) =>
      api.post<ApiCredentialSecret>(
        `/tenants/${tenantId}/apps/${tenantAppId}/credentials/${credentialId}/rotate`,
      ),
    onSuccess: () => invalidateCredentials(client, tenantId, tenantAppId),
  })
}

export function useRevokeCredential(tenantId: string, tenantAppId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ credentialId, reason }: { credentialId: string; reason?: string }) =>
      api.post<void>(
        `/tenants/${tenantId}/apps/${tenantAppId}/credentials/${credentialId}/revoke`,
        { reason },
      ),
    onSuccess: () => invalidateCredentials(client, tenantId, tenantAppId),
  })
}

export function useDeleteCredential(tenantId: string, tenantAppId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (credentialId: string) =>
      api.delete<void>(`/tenants/${tenantId}/apps/${tenantAppId}/credentials/${credentialId}`),
    onSuccess: () => invalidateCredentials(client, tenantId, tenantAppId),
  })
}

// ── Catálogo de apps ────────────────────────────────────────────────────────

export function useApps(params: ListParams & { isActive?: boolean; category?: string }) {
  return useQuery({
    queryKey: keys.apps(params),
    queryFn: () => api.get<Paged<AppSummary>>('/apps', { query: { ...params } }),
    placeholderData: (previous) => previous,
  })
}

export function useAppCategories() {
  return useQuery({
    queryKey: keys.appCategories,
    queryFn: () => api.get<string[]>('/apps/categories'),
    staleTime: 5 * 60_000,
  })
}

export function useApp(id?: string) {
  return useQuery({
    queryKey: keys.app(id ?? ''),
    queryFn: () => api.get<AppDetail>(`/apps/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateApp() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<AppDetail>('/apps', body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['apps'] })
      void client.invalidateQueries({ queryKey: keys.appCategories })
      void client.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useUpdateApp(id: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<AppDetail>(`/apps/${id}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.app(id) })
      void client.invalidateQueries({ queryKey: ['apps'] })
    },
  })
}

export function useDeleteApp() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/apps/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['apps'] })
      void client.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useSaveSettingDefinition(appId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.put(`/apps/${appId}/settings-schema`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.app(appId) })
      void client.invalidateQueries({ queryKey: ['apps'] })
    },
  })
}

export function useDeleteSettingDefinition(appId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (definitionId: string) =>
      api.delete<void>(`/apps/${appId}/settings-schema/${definitionId}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.app(appId) })
      void client.invalidateQueries({ queryKey: ['apps'] })
    },
  })
}

// ── Usuarios ────────────────────────────────────────────────────────────────

export function useUsers(params: ListParams & { tenantId?: string; isActive?: boolean; role?: string }) {
  return useQuery({
    queryKey: keys.users(params),
    queryFn: () => api.get<Paged<UserListItem>>('/users', { query: { ...params } }),
    placeholderData: (previous) => previous,
  })
}

export function useUser(id?: string) {
  return useQuery({
    queryKey: keys.user(id ?? ''),
    queryFn: () => api.get<UserDetail>(`/users/${id}`),
    enabled: Boolean(id),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: keys.roles,
    queryFn: () => api.get<Role[]>('/users/roles'),
    staleTime: 5 * 60_000,
  })
}

export function useCreateUser() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ user: UserDetail; temporaryPassword: string | null }>('/users', body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['users'] })
      void client.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useUpdateUser(id: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<UserDetail>(`/users/${id}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.user(id) })
      void client.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteUser() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/users/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['users'] })
      void client.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; newPassword?: string; mustChangePassword: boolean }) =>
      api.post<{ userId: string; email: string; temporaryPassword: string | null }>(
        `/users/${id}/reset-password`,
        body,
      ),
  })
}

export function useToggleUserLock() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, locked }: { id: string; locked: boolean }) =>
      api.post<void>(`/users/${id}/${locked ? 'lock' : 'unlock'}`),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: keys.user(variables.id) })
      void client.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

function invalidateTenantLists(client: QueryClient) {
  void client.invalidateQueries({ queryKey: ['tenants'] })
  void client.invalidateQueries({ queryKey: keys.dashboard })
}
