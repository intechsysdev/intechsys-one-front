import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Blocks,
  Building2,
  ChevronRight,
  KeyRound,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { useDashboard } from '@/lib/queries'
import { cn, describeAuditAction, formatNumber, formatRelative } from '@/lib/utils'
import { Avatar, Card, CardHeader, EmptyState, PageHeader, Skeleton } from '@/components/ui/Primitives'
import { LinkButton } from '@/components/ui/Button'
import { useAuth } from '@/providers/AuthProvider'

export function DashboardPage() {
  const { user } = useAuth()
  const isPlatformStaff =
    (user?.isPlatformAdmin ?? false) || (user?.roles.includes('PlatformSupport') ?? false)

  const { data, isPending } = useDashboard(isPlatformStaff)

  // Un usuario de empresa no tiene visión global: su portada son sus propios espacios.
  if (!isPlatformStaff) return <WorkspaceDashboard />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${user?.firstName ?? ''}`}
        description="Estado de la plataforma: empresas conectadas, aplicaciones publicadas y credenciales en circulación."
        actions={
          user?.isPlatformAdmin && (
            <>
              <LinkButton to="/apps?nueva=1" icon={<Blocks className="size-4" />}>
                Registrar app
              </LinkButton>
              <LinkButton to="/empresas?nueva=1" variant="primary" icon={<Building2 className="size-4" />}>
                Nueva empresa
              </LinkButton>
            </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Building2}
          label="Empresas"
          value={data?.totalTenants}
          context={data ? `${formatNumber(data.activeTenants)} activas` : undefined}
          loading={isPending}
          to="/empresas"
        />
        <StatTile
          icon={Blocks}
          label="Apps en catálogo"
          value={data?.totalApps}
          context={data ? `${formatNumber(data.totalSubscriptions)} asignaciones` : undefined}
          loading={isPending}
          to="/apps"
        />
        <StatTile
          icon={Users}
          label="Usuarios"
          value={data?.totalUsers}
          context={data ? `${formatNumber(data.activeUsers)} activos` : undefined}
          loading={isPending}
          to={user?.isPlatformAdmin ? '/usuarios' : undefined}
        />
        <StatTile
          icon={KeyRound}
          label="Credenciales activas"
          value={data?.activeCredentials}
          context={data ? `${formatNumber(data.revokedCredentials)} revocadas` : undefined}
          loading={isPending}
        />
      </div>

      {data && data.expiringCredentials > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-caution/40 bg-caution-soft px-4 py-3.5">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-caution" aria-hidden />
          <div>
            <p className="text-[0.875rem] font-medium text-ink">
              {formatNumber(data.expiringCredentials)} credencial(es) caducan en los próximos 30 días
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
              Rote las credenciales antes de la fecha para que las integraciones no pierdan acceso.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AdoptionCard
          title="Empresas con más apps"
          description="Número de aplicaciones asignadas a cada empresa."
          loading={isPending}
          emptyLabel="Todavía no hay empresas con apps asignadas."
          rows={
            data?.topTenants.map((tenant) => ({
              id: tenant.tenantId,
              name: tenant.name,
              slug: tenant.slug,
              value: tenant.appCount,
              secondary: `${formatNumber(tenant.userCount)} usuarios`,
              color: tenant.brandColor,
              to: `/empresas/${tenant.tenantId}`,
            })) ?? []
          }
          unit="apps"
        />

        <AdoptionCard
          title="Apps más adoptadas"
          description="Número de empresas que tienen asignada cada aplicación."
          loading={isPending}
          emptyLabel="Todavía no hay apps asignadas a ninguna empresa."
          rows={
            data?.topApps.map((app) => ({
              id: app.appId,
              name: app.name,
              slug: app.slug,
              value: app.tenantCount,
              secondary: `${formatNumber(app.credentialCount)} credenciales`,
              color: app.color,
              to: `/apps/${app.appId}`,
            })) ?? []
          }
          unit="empresas"
        />
      </div>

      <ActivityCard logs={data?.recentActivity} loading={isPending} />
    </div>
  )
}

// ── Número destacado ────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
  context,
  loading,
  to,
}: {
  icon: typeof Building2
  label: string
  value?: number
  context?: string
  loading?: boolean
  to?: string
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] font-medium text-ink-muted">{label}</span>
        <Icon className="size-4 text-ink-muted" aria-hidden />
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2.5 text-[2rem] leading-none font-semibold tracking-[-0.03em] text-ink tabular">
          {formatNumber(value ?? 0)}
        </p>
      )}

      <p className="mt-2 text-[0.75rem] text-ink-muted">{loading ? ' ' : (context ?? ' ')}</p>
    </>
  )

  if (!to) return <Card className="p-4">{content}</Card>

  return (
    <Link
      to={to}
      className="surface-card group p-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[var(--shadow-lifted)]"
    >
      {content}
    </Link>
  )
}

// ── Barras de magnitud ──────────────────────────────────────────────────────

interface AdoptionRow {
  id: string
  name: string
  slug: string
  value: number
  secondary: string
  color?: string | null
  to: string
}

/**
 * Una sola medida por fila, así que una sola tonalidad: el color no codifica
 * identidad, solo hace visible la proporción. El valor va etiquetado directamente.
 */
function AdoptionCard({
  title,
  description,
  rows,
  unit,
  loading,
  emptyLabel,
}: {
  title: string
  description: string
  rows: AdoptionRow[]
  unit: string
  loading?: boolean
  emptyLabel: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader title={title} description={description} />

      {loading ? (
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-[0.8125rem] text-ink-muted">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={row.to}
                className="group flex flex-col gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-inset"
                title={`${row.name}: ${formatNumber(row.value)} ${unit}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={row.name} color={row.color} size="sm" square />
                    <span className="truncate text-[0.8438rem] font-medium text-ink">
                      {row.name}
                    </span>
                    <span className="hidden truncate font-mono text-[0.6875rem] text-ink-muted sm:inline">
                      {row.slug}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-baseline gap-1.5">
                    <span className="text-[0.875rem] font-semibold text-ink tabular">
                      {formatNumber(row.value)}
                    </span>
                    <span className="text-[0.75rem] text-ink-muted">{unit}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Riel de fondo + marca fina con extremo redondeado anclada al origen. */}
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${Math.max((row.value / max) * 100, 3)}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 truncate text-right text-[0.75rem] text-ink-muted">
                    {row.secondary}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ── Actividad ───────────────────────────────────────────────────────────────

function ActivityCard({
  logs,
  loading,
}: {
  logs?: import('@/lib/types').AuditLog[]
  loading?: boolean
}) {
  const { user } = useAuth()

  return (
    <Card padded={false}>
      <div className="px-5 pt-5 pb-4">
        <CardHeader
          title="Actividad reciente"
          description="Últimos movimientos registrados en la auditoría de la plataforma."
          action={
            user?.isPlatformAdmin && (
              <Link
                to="/auditoria"
                className="flex items-center gap-1 text-[0.8125rem] font-medium text-accent transition-opacity hover:opacity-80"
              >
                Ver todo
                <ChevronRight className="size-3.5" />
              </Link>
            )
          }
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 px-5 pb-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !logs?.length ? (
        <EmptyState
          icon={<ShieldAlert className="size-5" />}
          title="Sin actividad todavía"
          description="Las acciones sobre empresas, apps y credenciales aparecerán aquí."
        />
      ) : (
        <ul className="divide-y divide-line/70 border-t border-line">
          {logs.map((log) => (
            <li key={log.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  log.success ? 'bg-positive' : 'bg-critical',
                )}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8438rem] text-ink">
                  {describeAuditAction(log.action)}
                  {log.tenantName && (
                    <span className="text-ink-muted"> · {log.tenantName}</span>
                  )}
                </p>
                <p className="truncate text-[0.75rem] text-ink-muted">
                  {log.actorName ?? 'Sistema'}
                  {log.ipAddress && ` · ${log.ipAddress}`}
                </p>
              </div>

              <time
                className="shrink-0 text-[0.75rem] text-ink-muted"
                dateTime={log.createdAt}
                title={new Date(log.createdAt).toLocaleString('es-CO')}
              >
                {formatRelative(log.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ── Portada de un usuario de empresa ────────────────────────────────────────

/**
 * Sin rol de plataforma no hay métricas globales que mostrar: la portada son las
 * empresas del usuario y el estado de configuración de sus apps.
 */
function WorkspaceDashboard() {
  const { user } = useAuth()
  const memberships = user?.memberships ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${user?.firstName ?? ''}`}
        description="Estos son los espacios a los que tiene acceso. Entre en uno para configurar sus aplicaciones."
      />

      {memberships.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Building2 className="size-5" />}
            title="Todavía no pertenece a ninguna empresa"
            description="Pida a un administrador de la plataforma que lo añada como miembro para poder configurar aplicaciones."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {memberships.map((membership) => (
            <Link
              key={membership.tenantId}
              to={`/empresas/${membership.tenantId}`}
              className="surface-card flex items-center gap-3.5 p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]"
            >
              <Avatar name={membership.tenantName} src={membership.logoUrl} square size="lg" />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{membership.tenantName}</p>
                <p className="truncate font-mono text-[0.6875rem] text-ink-muted">
                  {membership.tenantSlug}
                </p>
              </div>

              <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
