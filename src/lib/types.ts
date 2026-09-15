/** Contratos que expone one-api. Reflejan los DTO del backend. */

export type TenantStatus = 'Active' | 'Trial' | 'Suspended' | 'Archived'
export type TenantRole = 'Owner' | 'Admin' | 'Member' | 'Viewer'
export type AppEnvironment = 'Development' | 'Staging' | 'Production'
export type SettingDataType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Json'
  | 'Url'
  | 'Email'
  | 'Secret'
export type CredentialStatus = 'Active' | 'Revoked' | 'Expired'
export type SubscriptionStatus = 'Active' | 'Paused' | 'Expired' | 'Cancelled'

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface Membership {
  tenantId: string
  tenantName: string
  tenantSlug: string
  logoUrl?: string | null
  role: TenantRole
  isDefault: boolean
  tenantStatus: TenantStatus
}

export interface CurrentUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl?: string | null
  jobTitle?: string | null
  isPlatformAdmin: boolean
  roles: string[]
  memberships: Membership[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  expiresInSeconds: number
  user: CurrentUser
}

export interface Tenant {
  id: string
  name: string
  slug: string
  legalName?: string | null
  taxId?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  website?: string | null
  logoUrl?: string | null
  brandColor?: string | null
  country?: string | null
  city?: string | null
  address?: string | null
  status: TenantStatus
  plan?: string | null
  notes?: string | null
  maxApps?: number | null
  maxUsers?: number | null
  userCount: number
  appCount: number
  credentialCount: number
  createdAt: string
  updatedAt?: string | null
}

export interface TenantListItem {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  brandColor?: string | null
  status: TenantStatus
  plan?: string | null
  contactEmail?: string | null
  userCount: number
  appCount: number
  createdAt: string
}

export interface TenantMember {
  membershipId: string
  userId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl?: string | null
  jobTitle?: string | null
  role: TenantRole
  isActive: boolean
  isDefault: boolean
  userIsActive: boolean
  joinedAt?: string | null
  lastLoginAt?: string | null
}

export interface AppSummary {
  id: string
  name: string
  slug: string
  description?: string | null
  category?: string | null
  iconUrl?: string | null
  color?: string | null
  version?: string | null
  homepageUrl?: string | null
  documentationUrl?: string | null
  supportEmail?: string | null
  isActive: boolean
  isPublic: boolean
  availableScopes?: string | null
  settingCount: number
  tenantCount: number
  createdAt: string
  updatedAt?: string | null
}

export interface SettingDefinition {
  id: string
  appId: string
  key: string
  label: string
  description?: string | null
  placeholder?: string | null
  dataType: SettingDataType
  isRequired: boolean
  isSecret: boolean
  defaultValue?: string | null
  validationRegex?: string | null
  allowedValues?: string | null
  group?: string | null
  displayOrder: number
}

export interface AppDetail {
  app: AppSummary
  settingDefinitions: SettingDefinition[]
}

export interface TenantApp {
  id: string
  tenantId: string
  tenantName: string
  tenantSlug: string
  appId: string
  appName: string
  appSlug: string
  appIconUrl?: string | null
  appColor?: string | null
  appCategory?: string | null
  displayName?: string | null
  isEnabled: boolean
  status: SubscriptionStatus
  subscribedAt: string
  expiresAt?: string | null
  grantedScopes?: string | null
  allowedOrigins?: string | null
  webhookUrl?: string | null
  notes?: string | null
  credentialCount: number
  activeCredentialCount: number
  settingCount: number
  missingRequiredSettings: number
}

export interface TenantAppSetting {
  id: string
  tenantAppId: string
  key: string
  value?: string | null
  isSecret: boolean
  hasValue: boolean
  dataType: SettingDataType
  environment: AppEnvironment
  description?: string | null
  isReadOnly: boolean
  isFromSchema: boolean
  createdAt: string
  updatedAt?: string | null
}

export interface TenantAppDetail {
  subscription: TenantApp
  schema: SettingDefinition[]
  settings: TenantAppSetting[]
  credentials: ApiCredential[]
}

export interface ApiCredential {
  id: string
  tenantAppId: string
  name: string
  environment: AppEnvironment
  clientId: string
  keyPrefix: string
  maskedApiKey: string
  maskedSecret: string
  scopes?: string | null
  allowedIps?: string | null
  status: CredentialStatus
  expiresAt?: string | null
  lastUsedAt?: string | null
  lastUsedIp?: string | null
  usageCount: number
  revokedAt?: string | null
  revokedReason?: string | null
  createdAt: string
}

export interface ApiCredentialSecret {
  credential: ApiCredential
  apiKey: string
  apiSecret: string
  warning: string
}

export interface UserListItem {
  id: string
  email: string
  fullName: string
  avatarUrl?: string | null
  jobTitle?: string | null
  isActive: boolean
  isLockedOut: boolean
  roles: string[]
  tenantCount: number
  createdAt: string
  lastLoginAt?: string | null
}

export interface UserDetail {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl?: string | null
  jobTitle?: string | null
  phoneNumber?: string | null
  isActive: boolean
  emailConfirmed: boolean
  twoFactorEnabled: boolean
  mustChangePassword: boolean
  isLockedOut: boolean
  timeZone: string
  locale: string
  roles: string[]
  memberships: Membership[]
  createdAt: string
  lastLoginAt?: string | null
}

export interface Role {
  id: string
  name: string
  description?: string | null
  isSystem: boolean
  userCount: number
}

export interface AuditLog {
  id: number
  tenantId?: string | null
  tenantName?: string | null
  userId?: string | null
  actorName?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: string | null
  ipAddress?: string | null
  success: boolean
  errorMessage?: string | null
  createdAt: string
}

export interface DashboardStats {
  totalTenants: number
  activeTenants: number
  totalApps: number
  activeApps: number
  totalUsers: number
  activeUsers: number
  totalSubscriptions: number
  activeCredentials: number
  expiringCredentials: number
  revokedCredentials: number
  topTenants: {
    tenantId: string
    name: string
    slug: string
    logoUrl?: string | null
    brandColor?: string | null
    appCount: number
    userCount: number
  }[]
  topApps: {
    appId: string
    name: string
    slug: string
    iconUrl?: string | null
    color?: string | null
    tenantCount: number
    credentialCount: number
  }[]
  recentActivity: AuditLog[]
}
