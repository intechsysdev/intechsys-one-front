import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Building2,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  Variable,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Controls'
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Skeleton,
} from '@/components/ui/Primitives'
import {
  useApp,
  useDeleteApp,
  useDeleteSettingDefinition,
  useSaveSettingDefinition,
  useUpdateApp,
} from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import type { SettingDataType, SettingDefinition } from '@/lib/types'

const dataTypes: { value: SettingDataType; label: string }[] = [
  { value: 'String', label: 'Texto' },
  { value: 'Number', label: 'Número' },
  { value: 'Boolean', label: 'Sí / No' },
  { value: 'Json', label: 'JSON' },
  { value: 'Url', label: 'URL' },
  { value: 'Email', label: 'Correo' },
]

export function AppDetailPage() {
  const { appId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<'esquema' | 'general'>('esquema')
  const [deleting, setDeleting] = useState(false)

  const { data, isPending, error } = useApp(appId)
  const deleteApp = useDeleteApp()
  const canManage = user?.isPlatformAdmin ?? false

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Aplicación no encontrada"
        action={<Button onClick={() => navigate('/apps')}>Volver al catálogo</Button>}
      />
    )
  }

  if (isPending || !data) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  const { app, settingDefinitions } = data

  const remove = async () => {
    try {
      await deleteApp.mutateAsync(appId)
      toast.success('Aplicación eliminada')
      navigate('/apps')
    } catch (caught) {
      toast.error('No se pudo eliminar', {
        description: caught instanceof ApiError ? caught.message : undefined,
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: 'Catálogo', to: '/apps' }, { label: app.name }]} />}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={app.name} src={app.iconUrl} color={app.color} size="lg" square />
            <span>{app.name}</span>
            {app.isActive ? (
              <Badge tone="positive" dot>
                Activa
              </Badge>
            ) : (
              <Badge tone="caution" dot>
                Inactiva
              </Badge>
            )}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-[0.75rem]">{app.slug}</span>
            <span className="flex items-center gap-1.5 text-[0.8125rem]">
              <Building2 className="size-3.5" aria-hidden />
              {formatNumber(app.tenantCount)} empresa(s) la usan
            </span>
          </span>
        }
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as 'esquema' | 'general')}
        items={[
          { id: 'esquema', label: 'Esquema de variables', icon: <Variable className="size-4" /> },
          { id: 'general', label: 'Datos de la app', icon: <Pencil className="size-4" /> },
        ]}
      />

      {tab === 'esquema' && (
        <SchemaTab appId={appId} definitions={settingDefinitions} canManage={canManage} />
      )}

      {tab === 'general' && (
        <GeneralTab appId={appId} canManage={canManage} onDelete={() => setDeleting(true)} />
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={remove}
        loading={deleteApp.isPending}
        title="Eliminar aplicación"
        confirmLabel="Eliminar"
        description={
          <>
            Se eliminará <strong className="text-ink">{app.name}</strong> del catálogo. Solo es
            posible si ninguna empresa la tiene asignada.
          </>
        }
      />
    </div>
  )
}

// ── Esquema ─────────────────────────────────────────────────────────────────

function SchemaTab({
  appId,
  definitions,
  canManage,
}: {
  appId: string
  definitions: SettingDefinition[]
  canManage: boolean
}) {
  const [editing, setEditing] = useState<SettingDefinition | null>(null)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<SettingDefinition>()

  const deleteDefinition = useDeleteSettingDefinition(appId)

  const confirmDelete = async () => {
    if (!removing) return

    try {
      await deleteDefinition.mutateAsync(removing.id)
      toast.success('Variable eliminada del esquema')
      setRemoving(undefined)
    } catch (error) {
      toast.error('No se pudo eliminar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  const groups = definitions.reduce<Map<string, SettingDefinition[]>>((accumulator, definition) => {
    const group = definition.group || 'General'
    const bucket = accumulator.get(group) ?? []
    bucket.push(definition)
    accumulator.set(group, bucket)
    return accumulator
  }, new Map())

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <CardHeader
          title="Variables que la app espera"
          description="El portal usa este esquema para generar el formulario de cada empresa y para validar los valores antes de guardarlos."
          action={
            canManage && (
              <Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Añadir variable
              </Button>
            )
          }
        />

        {definitions.length === 0 ? (
          <EmptyState
            icon={<Variable className="size-5" />}
            title="Sin variables declaradas"
            description="Declare las claves que la app necesita: URL de servicios, tokens, límites o interruptores."
            action={
              canManage && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                  Añadir variable
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            {[...groups.entries()].map(([group, items]) => (
              <div key={group} className="flex flex-col gap-2">
                <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  {group}
                </p>

                <ul className="overflow-hidden rounded-xl border border-line">
                  {items.map((definition) => (
                    <li
                      key={definition.id}
                      className="flex items-center gap-3 border-b border-line px-3.5 py-3 last:border-b-0"
                    >
                      <GripVertical className="size-4 shrink-0 text-ink-muted/60" aria-hidden />

                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[0.75rem] text-ink">
                            {definition.key}
                          </code>
                          <span className="truncate text-[0.8125rem] text-ink-soft">
                            {definition.label}
                          </span>
                        </p>
                        {definition.description && (
                          <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
                            {definition.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge tone="neutral" className="font-normal">
                          {dataTypes.find((type) => type.value === definition.dataType)?.label ??
                            'Secreto'}
                        </Badge>
                        {definition.isRequired && <Badge tone="critical">Obligatoria</Badge>}
                        {definition.isSecret && <Badge tone="accent">Secreta</Badge>}
                      </div>

                      {canManage && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Editar ${definition.key}`}
                            onClick={() => setEditing(definition)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Eliminar ${definition.key}`}
                            onClick={() => setRemoving(definition)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <DefinitionModal
        appId={appId}
        open={creating || editing !== null}
        definition={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(undefined)}
        onConfirm={confirmDelete}
        loading={deleteDefinition.isPending}
        title="Eliminar del esquema"
        confirmLabel="Eliminar"
        description={
          <>
            <code className="font-mono text-ink">{removing?.key}</code> dejará de aparecer en el
            formulario de las empresas. Los valores ya guardados se conservan como variables
            propias.
          </>
        }
      />
    </div>
  )
}

function DefinitionModal({
  appId,
  open,
  definition,
  onClose,
}: {
  appId: string
  open: boolean
  definition: SettingDefinition | null
  onClose: () => void
}) {
  const saveDefinition = useSaveSettingDefinition(appId)

  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [dataType, setDataType] = useState<SettingDataType>('String')
  const [isRequired, setIsRequired] = useState(false)
  const [isSecret, setIsSecret] = useState(false)
  const [defaultValue, setDefaultValue] = useState('')
  const [group, setGroup] = useState('')
  const [allowedValues, setAllowedValues] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>()

  useEffect(() => {
    if (!open) return

    setKey(definition?.key ?? '')
    setLabel(definition?.label ?? '')
    setDescription(definition?.description ?? '')
    setPlaceholder(definition?.placeholder ?? '')
    setDataType(definition?.dataType === 'Secret' ? 'String' : (definition?.dataType ?? 'String'))
    setIsRequired(definition?.isRequired ?? false)
    setIsSecret(definition?.isSecret ?? false)
    setDefaultValue(definition?.defaultValue ?? '')
    setGroup(definition?.group ?? '')
    setAllowedValues(definition?.allowedValues ?? '')
    setErrors(undefined)
  }, [open, definition])

  const submit = async () => {
    setErrors(undefined)

    try {
      await saveDefinition.mutateAsync({
        id: definition?.id,
        key: key.trim(),
        label: label.trim() || key.trim(),
        description: description.trim() || null,
        placeholder: placeholder.trim() || null,
        dataType: isSecret ? 'Secret' : dataType,
        isRequired,
        isSecret,
        defaultValue: isSecret ? null : defaultValue.trim() || null,
        allowedValues: allowedValues.trim() || null,
        group: group.trim() || null,
        displayOrder: definition?.displayOrder ?? 0,
      })

      toast.success(definition ? 'Variable actualizada' : 'Variable añadida al esquema')
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        toast.error('No se pudo guardar', { description: error.message })
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={definition ? 'Editar variable' : 'Nueva variable del esquema'}
      description="Lo que declare aquí determina cómo se ve y se valida el campo en cada empresa."
      locked={saveDefinition.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saveDefinition.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={saveDefinition.isPending}
            disabled={key.trim().length === 0}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Clave"
            required
            autoFocus
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase().replace(/[^A-Z0-9_.:-]/g, '_'))}
            placeholder="API_BASE_URL"
            className="font-mono"
            hint="Es la clave con la que la app leerá el valor."
            error={errors?.Key?.[0]}
          />

          <Input
            label="Etiqueta"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="URL base del ERP"
            hint="Lo que verá quien configure la empresa."
          />
        </div>

        <Textarea
          label="Descripción"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Para qué sirve y de dónde se obtiene el valor."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Tipo de dato"
            value={dataType}
            disabled={isSecret}
            onChange={(event) => setDataType(event.target.value as SettingDataType)}
            hint={isSecret ? 'Los valores secretos siempre se tratan como texto cifrado.' : undefined}
          >
            {dataTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>

          <Input
            label="Grupo"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            placeholder="Conexión"
            hint="Agrupa los campos en el formulario."
          />

          <Input
            label="Valor por defecto"
            value={defaultValue}
            disabled={isSecret}
            onChange={(event) => setDefaultValue(event.target.value)}
            placeholder={isSecret ? 'No aplica a valores secretos' : '50'}
          />

          <Input
            label="Marcador de posición"
            value={placeholder}
            onChange={(event) => setPlaceholder(event.target.value)}
            placeholder="https://erp.empresa.com/api"
          />
        </div>

        <Input
          label="Valores permitidos"
          value={allowedValues}
          onChange={(event) => setAllowedValues(event.target.value)}
          placeholder='["bajo","medio","alto"]'
          className="font-mono text-[0.8125rem]"
          hint="Array JSON opcional. Si se define, el campo se muestra como lista desplegable."
        />

        <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-inset/50 p-4">
          <Switch
            checked={isRequired}
            onChange={setIsRequired}
            label="Obligatoria"
            description="El portal avisará mientras la empresa no le dé valor."
          />

          <Switch
            checked={isSecret}
            onChange={setIsSecret}
            label="Valor secreto"
            description="Se cifra en la base de datos y solo se revela bajo petición explícita, que queda auditada."
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Datos de la app ─────────────────────────────────────────────────────────

function GeneralTab({
  appId,
  canManage,
  onDelete,
}: {
  appId: string
  canManage: boolean
  onDelete: () => void
}) {
  const { data } = useApp(appId)
  const updateApp = useUpdateApp(appId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState('')
  const [color, setColor] = useState('#0ea5e9')
  const [iconUrl, setIconUrl] = useState('')
  const [homepageUrl, setHomepageUrl] = useState('')
  const [documentationUrl, setDocumentationUrl] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [scopes, setScopes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isPublic, setIsPublic] = useState(true)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!data) return

    const { app } = data
    setName(app.name)
    setDescription(app.description ?? '')
    setCategory(app.category ?? '')
    setVersion(app.version ?? '')
    setColor(app.color ?? '#0ea5e9')
    setIconUrl(app.iconUrl ?? '')
    setHomepageUrl(app.homepageUrl ?? '')
    setDocumentationUrl(app.documentationUrl ?? '')
    setSupportEmail(app.supportEmail ?? '')
    setScopes(app.availableScopes ?? '')
    setIsActive(app.isActive)
    setIsPublic(app.isPublic)
    setDirty(false)
  }, [data])

  const track = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setDirty(true)
  }

  const save = async () => {
    try {
      await updateApp.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        version: version.trim() || null,
        color,
        iconUrl: iconUrl.trim() || null,
        homepageUrl: homepageUrl.trim() || null,
        documentationUrl: documentationUrl.trim() || null,
        supportEmail: supportEmail.trim() || null,
        availableScopes: scopes.trim() || null,
        isActive,
        isPublic,
      })

      toast.success('Cambios guardados')
      setDirty(false)
    } catch (error) {
      toast.error('No se pudieron guardar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <fieldset disabled={!canManage} className="contents">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" value={name} onChange={(event) => track(setName)(event.target.value)} />
            <Input
              label="Categoría"
              value={category}
              onChange={(event) => track(setCategory)(event.target.value)}
            />
          </div>

          <Textarea
            label="Descripción"
            rows={2}
            value={description}
            onChange={(event) => track(setDescription)(event.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Versión"
              value={version}
              onChange={(event) => track(setVersion)(event.target.value)}
              className="font-mono"
            />

            <Input
              label="URL del icono"
              value={iconUrl}
              onChange={(event) => track(setIconUrl)(event.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-medium text-ink-soft">Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Color de la app"
                  value={color}
                  onChange={(event) => track(setColor)(event.target.value)}
                  className="h-9.5 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-inset p-1"
                />
                <Input
                  value={color}
                  onChange={(event) => track(setColor)(event.target.value)}
                  className="font-mono"
                  wrapperClassName="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Sitio"
              value={homepageUrl}
              onChange={(event) => track(setHomepageUrl)(event.target.value)}
            />
            <Input
              label="Documentación"
              value={documentationUrl}
              onChange={(event) => track(setDocumentationUrl)(event.target.value)}
            />
            <Input
              label="Correo de soporte"
              type="email"
              value={supportEmail}
              onChange={(event) => track(setSupportEmail)(event.target.value)}
            />
          </div>

          <Input
            label="Scopes disponibles"
            value={scopes}
            onChange={(event) => track(setScopes)(event.target.value)}
            className="font-mono text-[0.8125rem]"
            hint="Separados por espacios."
          />

          <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-inset/50 p-4">
            <Switch
              checked={isActive}
              onChange={track(setIsActive)}
              label="Activa"
              description="Una app inactiva no puede asignarse y deja de servir configuración."
            />
            <Switch
              checked={isPublic}
              onChange={track(setIsPublic)}
              label="Visible en el catálogo"
              description="Si se oculta, solo aparece para quien ya la tiene asignada."
            />
          </div>
        </fieldset>

        {canManage && (
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            {dirty && <span className="text-[0.8125rem] text-ink-muted">Hay cambios sin guardar</span>}
            <Button
              variant="primary"
              icon={<Save className="size-4" />}
              onClick={save}
              loading={updateApp.isPending}
              disabled={!dirty}
            >
              Guardar cambios
            </Button>
          </div>
        )}
      </Card>

      {canManage && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-critical/30">
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-ink">Eliminar del catálogo</h3>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Solo es posible si ninguna empresa tiene la app asignada.
            </p>
          </div>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={onDelete}>
            Eliminar
          </Button>
        </Card>
      )}
    </div>
  )
}
