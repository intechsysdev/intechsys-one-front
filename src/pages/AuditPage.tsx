import { useEffect, useState } from 'react'
import { CircleCheck, CircleX, ScrollText, Search } from 'lucide-react'
import { Input, Select } from '@/components/ui/Field'
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/Primitives'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { MonoValue } from '@/components/ui/Controls'
import { useAuditLogs } from '@/lib/queries'
import { describeAuditAction, formatDateTime } from '@/lib/utils'
import { useDebounced } from '@/lib/useDebounced'
import type { AuditLog } from '@/lib/types'

const actionGroups = [
  { value: '', label: 'Todas las acciones' },
  { value: 'auth', label: 'Autenticación' },
  { value: 'tenant', label: 'Empresas' },
  { value: 'tenant_app', label: 'Asignación de apps' },
  { value: 'app', label: 'Catálogo de apps' },
  { value: 'setting', label: 'Variables' },
  { value: 'credential', label: 'Credenciales' },
  { value: 'user', label: 'Usuarios' },
  { value: 'integration', label: 'Integraciones' },
]

export function AuditPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<AuditLog>()

  const debouncedSearch = useDebounced(search, 300)
  const { data, isPending } = useAuditLogs({
    page,
    pageSize: 30,
    search: debouncedSearch || undefined,
    action: action || undefined,
  })

  useEffect(() => setPage(1), [debouncedSearch, action])

  const columns: Column<AuditLog>[] = [
    {
      key: 'status',
      header: '',
      className: 'w-10',
      render: (log) =>
        log.success ? (
          <CircleCheck className="size-4 text-positive" aria-label="Correcta" />
        ) : (
          <CircleX className="size-4 text-critical" aria-label="Fallida" />
        ),
    },
    {
      key: 'action',
      header: 'Acción',
      render: (log) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{describeAuditAction(log.action)}</p>
          <p className="truncate font-mono text-[0.6875rem] text-ink-muted">{log.action}</p>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (log) => (
        <div className="min-w-0">
          <p className="truncate text-ink-soft">{log.actorName ?? 'Sistema'}</p>
          {log.ipAddress && (
            <p className="truncate font-mono text-[0.6875rem] text-ink-muted">{log.ipAddress}</p>
          )}
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Empresa',
      render: (log) =>
        log.tenantName ? (
          <Badge tone="neutral">{log.tenantName}</Badge>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: 'when',
      header: 'Fecha',
      align: 'right',
      className: 'w-48',
      render: (log) => (
        <time className="text-[0.8125rem] text-ink-muted" dateTime={log.createdAt}>
          {formatDateTime(log.createdAt)}
        </time>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de las operaciones sensibles: accesos, cambios de configuración y movimientos de credenciales."
      >
        <div className="flex flex-wrap items-end gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por acción, actor o entidad…"
            leading={<Search className="size-4" />}
            wrapperClassName="min-w-64 flex-1 sm:max-w-sm"
            aria-label="Buscar en la auditoría"
          />

          <Select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            wrapperClassName="w-56"
            aria-label="Filtrar por tipo de acción"
          >
            {actionGroups.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(log) => String(log.id)}
        loading={isPending}
        onRowClick={setDetail}
        empty={
          <EmptyState
            icon={<ScrollText className="size-5" />}
            title="Sin registros"
            description="No hay eventos que coincidan con los filtros aplicados."
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

      {detail && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[0.9375rem] font-semibold text-ink">
                {describeAuditAction(detail.action)}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                {formatDateTime(detail.createdAt)} · {detail.actorName ?? 'Sistema'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDetail(undefined)}
              className="text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
            >
              Cerrar
            </button>
          </div>

          <dl className="grid gap-3 text-[0.8125rem] sm:grid-cols-2">
            <Field label="Entidad" value={detail.entityType ?? '—'} />
            <Field label="Identificador" value={detail.entityId ?? '—'} mono />
            <Field label="Empresa" value={detail.tenantName ?? '—'} />
            <Field label="Dirección IP" value={detail.ipAddress ?? '—'} mono />
          </dl>

          {detail.errorMessage && (
            <p className="rounded-lg border border-critical/40 bg-critical-soft px-3 py-2 text-[0.8125rem] text-critical">
              {detail.errorMessage}
            </p>
          )}

          {detail.metadata && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-medium text-ink-soft">Detalle</span>
              <pre className="overflow-x-auto rounded-lg border border-line bg-inset px-3 py-2.5 font-mono text-[0.75rem] text-ink-soft">
                {safeFormat(detail.metadata)}
              </pre>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0">
        {mono && value !== '—' ? (
          <MonoValue value={value} copyValue={value} />
        ) : (
          <span className="truncate text-ink-soft">{value}</span>
        )}
      </dd>
    </div>
  )
}

function safeFormat(json: string) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}
