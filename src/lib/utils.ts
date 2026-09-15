import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { AppEnvironment, CredentialStatus, TenantRole, TenantStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const relativeFormatter = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' })

export function formatDate(value?: string | null) {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value))
}

/** "hace 3 minutos", "en 2 días". Cae a fecha absoluta pasado el mes. */
export function formatRelative(value?: string | null) {
  if (!value) return '—'

  const target = new Date(value).getTime()
  const diffSeconds = Math.round((target - Date.now()) / 1000)
  const absolute = Math.abs(diffSeconds)

  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86_400, 'hour'],
    [604_800, 'day'],
    [2_592_000, 'week'],
  ]

  if (absolute >= 2_592_000) return dateFormatter.format(new Date(value))

  for (const [limit, unit] of steps) {
    if (absolute < limit) {
      const divisor = limit === 60 ? 1 : limit === 3600 ? 60 : limit === 86_400 ? 3600 : limit === 604_800 ? 86_400 : 604_800
      return relativeFormatter.format(Math.round(diffSeconds / divisor), unit)
    }
  }

  return dateFormatter.format(new Date(value))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO').format(value)
}

/** Iniciales para el avatar por defecto. */
export function initials(name?: string | null) {
  if (!name) return '??'

  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function slugify(value: string, maxLength = 80) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')
}

export async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    // Contextos sin permisos de portapapeles: se usa el camino antiguo.
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()

    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  }
}

export const tenantStatusMeta: Record<TenantStatus, { label: string; tone: BadgeTone }> = {
  Active: { label: 'Activa', tone: 'positive' },
  Trial: { label: 'En prueba', tone: 'info' },
  Suspended: { label: 'Suspendida', tone: 'caution' },
  Archived: { label: 'Archivada', tone: 'neutral' },
}

export const tenantRoleMeta: Record<TenantRole, { label: string; description: string }> = {
  Owner: { label: 'Propietario', description: 'Control total de la empresa, incluidos los secretos.' },
  Admin: { label: 'Administrador', description: 'Configura apps, variables y credenciales.' },
  Member: { label: 'Miembro', description: 'Consulta la configuración sin modificarla.' },
  Viewer: { label: 'Observador', description: 'Solo lectura, sin acceso a valores secretos.' },
}

export const credentialStatusMeta: Record<CredentialStatus, { label: string; tone: BadgeTone }> = {
  Active: { label: 'Activa', tone: 'positive' },
  Revoked: { label: 'Revocada', tone: 'critical' },
  Expired: { label: 'Caducada', tone: 'caution' },
}

/**
 * Marca que el API entiende como “no toques este valor”. El formulario la envía de vuelta
 * cuando el usuario no modificó un campo secreto.
 */
export const SECRET_PLACEHOLDER = '••••••••'

export const environments: AppEnvironment[] = ['Development', 'Staging', 'Production']

export const environmentMeta: Record<
  AppEnvironment,
  { label: string; short: string; color: string; description: string }
> = {
  Development: {
    label: 'Desarrollo',
    short: 'DEV',
    color: 'var(--env-development)',
    description: 'Entorno local de los equipos. Sin datos reales.',
  },
  Staging: {
    label: 'Pruebas',
    short: 'STG',
    color: 'var(--env-staging)',
    description: 'Réplica previa a producción para validaciones.',
  },
  Production: {
    label: 'Producción',
    short: 'PRD',
    color: 'var(--env-production)',
    description: 'Entorno real. Cualquier cambio afecta a la operación.',
  },
}

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'caution' | 'critical' | 'info'

/** Traduce el verbo de auditoría a algo legible en el panel. */
export function describeAuditAction(action: string) {
  const dictionary: Record<string, string> = {
    'auth.login': 'Inició sesión',
    'auth.logout': 'Cerró sesión',
    'auth.login_failed': 'Intento de acceso fallido',
    'auth.password_changed': 'Cambió su contraseña',
    'auth.profile_updated': 'Actualizó su perfil',
    'auth.refresh_reuse_detected': 'Reutilización de token detectada',
    'tenant.created': 'Creó una empresa',
    'tenant.updated': 'Actualizó una empresa',
    'tenant.deleted': 'Archivó una empresa',
    'tenant.member_added': 'Añadió un miembro',
    'tenant.member_updated': 'Cambió el rol de un miembro',
    'tenant.member_removed': 'Retiró un miembro',
    'tenant_app.assigned': 'Asignó una app',
    'tenant_app.updated': 'Actualizó una asignación',
    'tenant_app.removed': 'Retiró una app',
    'app.created': 'Registró una app',
    'app.updated': 'Actualizó una app',
    'app.deleted': 'Eliminó una app',
    'app.setting_definition_saved': 'Editó el esquema de variables',
    'app.setting_definition_deleted': 'Eliminó una variable del esquema',
    'setting.saved': 'Guardó una variable',
    'setting.bulk_saved': 'Guardó la configuración',
    'setting.deleted': 'Eliminó una variable',
    'setting.revealed': 'Reveló un valor secreto',
    'credential.created': 'Emitió una credencial',
    'credential.updated': 'Actualizó una credencial',
    'credential.rotated': 'Rotó una credencial',
    'credential.revoked': 'Revocó una credencial',
    'credential.deleted': 'Eliminó una credencial',
    'user.created': 'Creó un usuario',
    'user.updated': 'Actualizó un usuario',
    'user.deleted': 'Eliminó un usuario',
    'user.password_reset': 'Restableció una contraseña',
    'user.locked': 'Bloqueó un usuario',
    'user.unlocked': 'Desbloqueó un usuario',
    'integration.auth_failed': 'Autenticación de integración fallida',
  }

  return dictionary[action] ?? action
}
