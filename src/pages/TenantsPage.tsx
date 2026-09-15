import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Plus, Search } from 'lucide-react'
import {
  TenantForm,
  emptyTenantForm,
  tenantFormToPayload,
  type TenantFormValues,
} from '@/components/domain/TenantForm'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Avatar, Badge, EmptyState, PageHeader } from '@/components/ui/Primitives'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { useCreateTenant, useTenants } from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { formatDate, formatNumber, tenantStatusMeta } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useDebounced } from '@/lib/useDebounced'
import type { TenantListItem } from '@/lib/types'

export function TenantsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search, 300)

  const [creating, setCreating] = useState(searchParams.get('nueva') === '1')

  useEffect(() => setPage(1), [debouncedSearch, status])

  const { data, isPending } = useTenants({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
  })

  const closeCreate = () => {
    setCreating(false)
    if (searchParams.has('nueva')) {
      searchParams.delete('nueva')
      setSearchParams(searchParams, { replace: true })
    }
  }

  const columns: Column<TenantListItem>[] = [
    {
      key: 'name',
      header: 'Empresa',
      render: (tenant) => (
        <div className="flex items-center gap-3">
          <Avatar name={tenant.name} src={tenant.logoUrl} color={tenant.brandColor} square />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{tenant.name}</p>
            <p className="truncate font-mono text-[0.6875rem] text-ink-muted">{tenant.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (tenant) => {
        const meta = tenantStatusMeta[tenant.status]
        return <Badge tone={meta.tone} dot>{meta.label}</Badge>
      },
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (tenant) => <span className="text-ink-soft">{tenant.plan ?? '—'}</span>,
    },
    {
      key: 'apps',
      header: 'Apps',
      align: 'right',
      className: 'w-20',
      render: (tenant) => <span className="tabular">{formatNumber(tenant.appCount)}</span>,
    },
    {
      key: 'users',
      header: 'Usuarios',
      align: 'right',
      className: 'w-24',
      render: (tenant) => <span className="tabular">{formatNumber(tenant.userCount)}</span>,
    },
    {
      key: 'created',
      header: 'Alta',
      align: 'right',
      className: 'w-28',
      render: (tenant) => (
        <span className="text-[0.8125rem] text-ink-muted">{formatDate(tenant.createdAt)}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Empresas"
        description="Cada empresa es un espacio aislado con sus propias apps, variables y credenciales."
        actions={
          user?.isPlatformAdmin && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Nueva empresa
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, identificador, NIT o correo…"
            leading={<Search className="size-4" />}
            wrapperClassName="min-w-64 flex-1 sm:max-w-sm"
            aria-label="Buscar empresas"
          />

          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            wrapperClassName="w-44"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="Active">Activas</option>
            <option value="Trial">En prueba</option>
            <option value="Suspended">Suspendidas</option>
            <option value="Archived">Archivadas</option>
          </Select>
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(tenant) => tenant.id}
        loading={isPending}
        onRowClick={(tenant) => navigate(`/empresas/${tenant.id}`)}
        empty={
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={search || status ? 'Sin coincidencias' : 'Aún no hay empresas'}
            description={
              search || status
                ? 'Pruebe con otro término de búsqueda o cambie el filtro de estado.'
                : 'Cree la primera empresa para empezar a asignarle aplicaciones y credenciales.'
            }
            action={
              user?.isPlatformAdmin &&
              !search &&
              !status && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                  Crear empresa
                </Button>
              )
            }
          />
        }
      />

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}

      <CreateTenantModal open={creating} onClose={closeCreate} />
    </div>
  )
}

function CreateTenantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const createTenant = useCreateTenant()
  const [values, setValues] = useState<TenantFormValues>(emptyTenantForm)
  const [errors, setErrors] = useState<Record<string, string[]>>()

  useEffect(() => {
    if (open) {
      setValues(emptyTenantForm)
      setErrors(undefined)
    }
  }, [open])

  const submit = async () => {
    setErrors(undefined)

    try {
      const tenant = await createTenant.mutateAsync(tenantFormToPayload(values, true))
      toast.success('Empresa creada', { description: `${tenant.name} ya puede recibir apps.` })
      onClose()
      navigate(`/empresas/${tenant.id}`)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        toast.error('No se pudo crear la empresa', { description: error.message })
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva empresa"
      description="Los datos de contacto y el plan se pueden ajustar más adelante."
      width="lg"
      locked={createTenant.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={createTenant.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={createTenant.isPending}
            disabled={values.name.trim().length === 0}
          >
            Crear empresa
          </Button>
        </>
      }
    >
      <TenantForm mode="create" values={values} onChange={setValues} errors={errors} />
    </Modal>
  )
}
