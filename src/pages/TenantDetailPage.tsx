import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Archive,
  Blocks,
  ChevronRight,
  KeyRound,
  MoreHorizontal,
  Plus,
  Save,
  Settings2,
  ShieldOff,
  Users,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/AppShell'
import {
  TenantForm,
  emptyTenantForm,
  tenantFormToPayload,
  tenantToForm,
  type TenantFormValues,
} from '@/components/domain/TenantForm'
import { AssignAppModal } from '@/components/domain/AssignAppModal'
import { MembersPanel } from '@/components/domain/MembersPanel'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { DropdownMenu, MenuItem, Tabs } from '@/components/ui/Controls'
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from '@/components/ui/Primitives'
import { useDeleteTenant, useTenant, useTenantApps, useUpdateTenant } from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { cn, formatNumber, tenantStatusMeta } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import type { TenantApp } from '@/lib/types'

type TabId = 'apps' | 'miembros' | 'general'

export function TenantDetailPage() {
  const { tenantId = '' } = useParams()
  const navigate = useNavigate()
  const { user, canManageTenant } = useAuth()
  const [tab, setTab] = useState<TabId>('apps')
  const [archiving, setArchiving] = useState(false)

  const { data: tenant, isPending, error } = useTenant(tenantId)
  const { data: apps } = useTenantApps(tenantId)
  const deleteTenant = useDeleteTenant()

  const canManage = canManageTenant(tenantId)

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Empresa no encontrada"
        description="Puede que se haya archivado o que no tenga acceso a ella."
        action={<Button onClick={() => navigate('/empresas')}>Volver a empresas</Button>}
      />
    )
  }

  const statusMeta = tenant ? tenantStatusMeta[tenant.status] : null

  const archive = async () => {
    try {
      await deleteTenant.mutateAsync(tenantId)
      toast.success('Empresa archivada', {
        description: 'Sus credenciales activas fueron revocadas.',
      })
      navigate('/empresas')
    } catch (caught) {
      toast.error('No se pudo archivar', {
        description: caught instanceof ApiError ? caught.message : undefined,
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: 'Empresas', to: '/empresas' }, { label: tenant?.name ?? '…' }]} />}
        title={
          isPending ? (
            <Skeleton className="h-7 w-56" />
          ) : (
            <span className="flex flex-wrap items-center gap-3">
              <Avatar
                name={tenant?.name}
                src={tenant?.logoUrl}
                color={tenant?.brandColor}
                size="lg"
                square
              />
              <span>{tenant?.name}</span>
              {statusMeta && (
                <Badge tone={statusMeta.tone} dot>
                  {statusMeta.label}
                </Badge>
              )}
            </span>
          )
        }
        description={
          tenant && (
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.75rem]">
              <span>{tenant.slug}</span>
              {tenant.plan && <span className="text-ink-soft">plan: {tenant.plan}</span>}
              {tenant.contactEmail && <span>{tenant.contactEmail}</span>}
            </span>
          )
        }
        actions={
          canManage && (
            <DropdownMenu
              trigger={({ toggle }) => (
                <Button size="icon" variant="secondary" onClick={toggle} aria-label="Más acciones">
                  <MoreHorizontal className="size-4" />
                </Button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem
                    icon={<Settings2 className="size-4" />}
                    onClick={() => {
                      close()
                      setTab('general')
                    }}
                  >
                    Editar datos
                  </MenuItem>

                  {user?.isPlatformAdmin && (
                    <MenuItem
                      tone="danger"
                      icon={<Archive className="size-4" />}
                      onClick={() => {
                        close()
                        setArchiving(true)
                      }}
                    >
                      Archivar empresa
                    </MenuItem>
                  )}
                </>
              )}
            </DropdownMenu>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricChip
          icon={Blocks}
          label="Aplicaciones"
          value={tenant?.appCount}
          limit={tenant?.maxApps}
          loading={isPending}
        />
        <MetricChip
          icon={Users}
          label="Usuarios"
          value={tenant?.userCount}
          limit={tenant?.maxUsers}
          loading={isPending}
        />
        <MetricChip
          icon={KeyRound}
          label="Credenciales activas"
          value={tenant?.credentialCount}
          loading={isPending}
        />
      </div>

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        items={[
          {
            id: 'apps',
            label: 'Aplicaciones',
            icon: <Blocks className="size-4" />,
            badge: apps ? <CountBadge value={apps.length} /> : undefined,
          },
          { id: 'miembros', label: 'Miembros', icon: <Users className="size-4" /> },
          { id: 'general', label: 'Datos de la empresa', icon: <Settings2 className="size-4" /> },
        ]}
      />

      {tab === 'apps' && <TenantAppsTab tenantId={tenantId} canManage={canManage} />}
      {tab === 'miembros' && <MembersPanel tenantId={tenantId} canManage={canManage} />}
      {tab === 'general' && <TenantGeneralTab tenantId={tenantId} canManage={canManage} />}

      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        onConfirm={archive}
        loading={deleteTenant.isPending}
        title="Archivar empresa"
        confirmLabel="Archivar"
        description={
          <>
            <p>
              <strong className="text-ink">{tenant?.name}</strong> dejará de aparecer en los listados
              y <strong className="text-ink">todas sus credenciales activas serán revocadas</strong>.
            </p>
            <p className="mt-2">
              Las integraciones que estén usando esas llaves dejarán de recibir configuración de
              inmediato.
            </p>
          </>
        }
      />
    </div>
  )
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="rounded-md bg-inset px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink-muted tabular">
      {value}
    </span>
  )
}

function MetricChip({
  icon: Icon,
  label,
  value,
  limit,
  loading,
}: {
  icon: typeof Blocks
  label: string
  value?: number
  limit?: number | null
  loading?: boolean
}) {
  const ratio = limit && value !== undefined ? value / limit : null
  const nearLimit = ratio !== null && ratio >= 0.8

  return (
    <Card className="flex items-center gap-3.5 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-inset text-ink-muted">
        <Icon className="size-4.5" aria-hidden />
      </span>

      <div className="min-w-0">
        <p className="text-[0.75rem] text-ink-muted">{label}</p>
        {loading ? (
          <Skeleton className="mt-1.5 h-6 w-16" />
        ) : (
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-xl font-semibold text-ink tabular">{formatNumber(value ?? 0)}</span>
            {limit && (
              <span className={cn('text-[0.75rem] tabular', nearLimit ? 'text-caution' : 'text-ink-muted')}>
                / {formatNumber(limit)}
              </span>
            )}
          </p>
        )}
      </div>
    </Card>
  )
}

// ── Pestaña de aplicaciones ─────────────────────────────────────────────────

function TenantAppsTab({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const { data: apps, isPending } = useTenantApps(tenantId)
  const [assigning, setAssigning] = useState(false)

  const assignedIds = useMemo(() => new Set(apps?.map((app) => app.appId) ?? []), [apps])

  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && apps && apps.length > 0 && (
        <div className="flex justify-end">
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAssigning(true)}>
            Asignar aplicación
          </Button>
        </div>
      )}

      {!apps?.length ? (
        <Card padded={false}>
          <EmptyState
            icon={<Blocks className="size-5" />}
            title="Sin aplicaciones asignadas"
            description="Asigne una app del catálogo para configurar sus variables y emitir credenciales de integración."
            action={
              canManage && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAssigning(true)}>
                  Asignar aplicación
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <TenantAppCard key={app.id} tenantId={tenantId} app={app} />
          ))}
        </div>
      )}

      <AssignAppModal
        tenantId={tenantId}
        open={assigning}
        onClose={() => setAssigning(false)}
        assignedAppIds={assignedIds}
      />
    </div>
  )
}

function TenantAppCard({ tenantId, app }: { tenantId: string; app: TenantApp }) {
  const disabled = !app.isEnabled || app.status !== 'Active'

  return (
    <Link
      to={`/empresas/${tenantId}/apps/${app.id}`}
      className={cn(
        'surface-card group flex flex-col gap-3.5 p-4 transition-[border-color,box-shadow,transform]',
        'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={app.appName} src={app.appIconUrl} color={app.appColor} square size="lg" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{app.displayName || app.appName}</p>
          <p className="truncate font-mono text-[0.6875rem] text-ink-muted">{app.appSlug}</p>
        </div>

        <ChevronRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {disabled ? (
          <Badge tone="caution" dot>
            Deshabilitada
          </Badge>
        ) : (
          <Badge tone="positive" dot>
            Activa
          </Badge>
        )}

        {app.missingRequiredSettings > 0 && (
          <Badge tone="critical">
            {app.missingRequiredSettings} variable(s) sin valor
          </Badge>
        )}

        {app.activeCredentialCount === 0 && <Badge tone="neutral">Sin credenciales</Badge>}
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-3 text-[0.75rem]">
        <div>
          <dt className="text-ink-muted">Variables</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular">{formatNumber(app.settingCount)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Credenciales</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular">
            {formatNumber(app.activeCredentialCount)}
            <span className="font-normal text-ink-muted"> / {formatNumber(app.credentialCount)}</span>
          </dd>
        </div>
      </dl>
    </Link>
  )
}

// ── Pestaña de datos ────────────────────────────────────────────────────────

function TenantGeneralTab({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const { data: tenant } = useTenant(tenantId)
  const updateTenant = useUpdateTenant(tenantId)
  const [values, setValues] = useState<TenantFormValues>(emptyTenantForm)
  const [errors, setErrors] = useState<Record<string, string[]>>()
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (tenant) {
      setValues(tenantToForm(tenant))
      setDirty(false)
    }
  }, [tenant])

  const save = async () => {
    setErrors(undefined)

    try {
      await updateTenant.mutateAsync(tenantFormToPayload(values, false))
      toast.success('Cambios guardados')
      setDirty(false)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        toast.error('No se pudieron guardar los cambios', { description: error.message })
      }
    }
  }

  if (!tenant) return <Skeleton className="h-96 w-full rounded-xl" />

  return (
    <Card className="flex flex-col gap-6">
      <fieldset disabled={!canManage} className="contents">
        <TenantForm
          mode="edit"
          values={values}
          onChange={(next) => {
            setValues(next)
            setDirty(true)
          }}
          errors={errors}
        />
      </fieldset>

      {canManage && (
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          {dirty && <span className="text-[0.8125rem] text-ink-muted">Hay cambios sin guardar</span>}
          <Button
            variant="primary"
            icon={<Save className="size-4" />}
            onClick={save}
            loading={updateTenant.isPending}
            disabled={!dirty}
          >
            Guardar cambios
          </Button>
        </div>
      )}

      {!canManage && (
        <p className="flex items-center gap-2 border-t border-line pt-4 text-[0.8125rem] text-ink-muted">
          <ShieldOff className="size-3.5" aria-hidden />
          Solo los propietarios y administradores de la empresa pueden modificar estos datos.
        </p>
      )}
    </Card>
  )
}
