import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Blocks, Building2, Plus, Search, Variable } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Avatar, Badge, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Primitives'
import { Pagination } from '@/components/ui/DataTable'
import { useAppCategories, useApps, useCreateApp } from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { formatNumber, slugify } from '@/lib/utils'
import { useDebounced } from '@/lib/useDebounced'
import { useAuth } from '@/providers/AuthProvider'
import type { AppSummary } from '@/lib/types'

export function AppsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(searchParams.get('nueva') === '1')

  const debouncedSearch = useDebounced(search, 300)
  const { data, isPending } = useApps({
    page,
    pageSize: 24,
    search: debouncedSearch || undefined,
    category: category || undefined,
  })
  const { data: categories } = useAppCategories()

  useEffect(() => setPage(1), [debouncedSearch, category])

  const closeCreate = () => {
    setCreating(false)
    if (searchParams.has('nueva')) {
      searchParams.delete('nueva')
      setSearchParams(searchParams, { replace: true })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Catálogo de aplicaciones"
        description="Las apps que las empresas pueden integrar. Cada una declara qué variables espera recibir."
        actions={
          user?.isPlatformAdmin && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Registrar app
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o descripción…"
            leading={<Search className="size-4" />}
            wrapperClassName="min-w-64 flex-1 sm:max-w-sm"
            aria-label="Buscar aplicaciones"
          />

          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            wrapperClassName="w-52"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories?.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <Card padded={false}>
          <EmptyState
            icon={<Blocks className="size-5" />}
            title={search || category ? 'Sin coincidencias' : 'El catálogo está vacío'}
            description={
              search || category
                ? 'Pruebe con otro término o quite el filtro de categoría.'
                : 'Registre la primera aplicación para poder asignarla a las empresas.'
            }
            action={
              user?.isPlatformAdmin &&
              !search &&
              !category && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                  Registrar app
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}

      <CreateAppModal open={creating} onClose={closeCreate} />
    </div>
  )
}

function AppCard({ app }: { app: AppSummary }) {
  return (
    <Link
      to={`/apps/${app.id}`}
      className="surface-card flex flex-col gap-3.5 p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={app.name} src={app.iconUrl} color={app.color} square size="lg" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{app.name}</p>
          <p className="truncate font-mono text-[0.6875rem] text-ink-muted">{app.slug}</p>
        </div>

        {!app.isActive && <Badge tone="caution">Inactiva</Badge>}
      </div>

      <p className="line-clamp-2 min-h-10 text-[0.8125rem] leading-relaxed text-ink-muted">
        {app.description || 'Sin descripción.'}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {app.category && <Badge tone="neutral">{app.category}</Badge>}
        {app.version && (
          <Badge tone="neutral" className="font-mono font-normal">
            v{app.version}
          </Badge>
        )}
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-3 text-[0.75rem]">
        <div className="flex items-center gap-1.5">
          <Variable className="size-3.5 text-ink-muted" aria-hidden />
          <dt className="sr-only">Variables</dt>
          <dd className="text-ink-soft tabular">
            <span className="font-semibold text-ink">{formatNumber(app.settingCount)}</span> variables
          </dd>
        </div>

        <div className="flex items-center gap-1.5">
          <Building2 className="size-3.5 text-ink-muted" aria-hidden />
          <dt className="sr-only">Empresas</dt>
          <dd className="text-ink-soft tabular">
            <span className="font-semibold text-ink">{formatNumber(app.tenantCount)}</span> empresas
          </dd>
        </div>
      </dl>
    </Link>
  )
}

function CreateAppModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const createApp = useCreateApp()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [color, setColor] = useState('#0ea5e9')
  const [scopes, setScopes] = useState('config.read')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string[]>>()

  useEffect(() => {
    if (!open) return

    setName('')
    setSlug('')
    setSlugTouched(false)
    setDescription('')
    setCategory('')
    setVersion('1.0.0')
    setColor('#0ea5e9')
    setScopes('config.read')
    setIsActive(true)
    setErrors(undefined)
  }, [open])

  const submit = async () => {
    setErrors(undefined)

    try {
      const detail = await createApp.mutateAsync({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        category: category.trim() || null,
        version: version.trim() || null,
        color,
        isActive,
        isPublic: true,
        availableScopes: scopes.trim() || null,
        settingDefinitions: [],
      })

      toast.success('Aplicación registrada', {
        description: 'Defina ahora las variables que espera recibir.',
      })

      onClose()
      navigate(`/apps/${detail.app.id}`)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        toast.error('No se pudo registrar', { description: error.message })
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar aplicación"
      description="Tras crearla podrá declarar el esquema de variables que la app necesita."
      locked={createApp.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={createApp.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={createApp.isPending}
            disabled={name.trim().length === 0}
          >
            Registrar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            required
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (!slugTouched) setSlug(slugify(event.target.value))
            }}
            placeholder="Pedidos"
            error={errors?.Name?.[0]}
          />

          <Input
            label="Identificador"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true)
              setSlug(slugify(event.target.value))
            }}
            placeholder="pedidos"
            className="font-mono"
            hint="Es el nombre técnico con el que la app se identifica."
            error={errors?.Slug?.[0]}
          />
        </div>

        <Textarea
          label="Descripción"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Qué hace la aplicación y con qué se integra."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Categoría"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Operaciones"
          />

          <Input
            label="Versión"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            placeholder="1.0.0"
            className="font-mono"
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-ink-soft">Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Color de la app"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9.5 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-inset p-1"
              />
              <Input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="font-mono"
                wrapperClassName="flex-1"
              />
            </div>
          </div>
        </div>

        <Input
          label="Scopes disponibles"
          value={scopes}
          onChange={(event) => setScopes(event.target.value)}
          placeholder="config.read orders.read orders.write"
          className="font-mono text-[0.8125rem]"
          hint="Separados por espacios. Definen qué puede pedir la app."
        />

        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Disponible en el catálogo"
          description="Solo las apps activas pueden asignarse a nuevas empresas."
        />
      </div>
    </Modal>
  )
}
