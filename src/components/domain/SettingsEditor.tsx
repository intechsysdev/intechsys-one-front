import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Eye, EyeOff, Plus, RotateCcw, Save, Trash2, Variable } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Badge, Card, CardHeader, EmptyState, SectionDivider } from '@/components/ui/Primitives'
import { revealSetting, useDeleteSetting, useSaveSettings, useSettings } from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { SECRET_PLACEHOLDER, cn, environmentMeta } from '@/lib/utils'
import type {
  AppEnvironment,
  SettingDataType,
  SettingDefinition,
  TenantAppSetting,
} from '@/lib/types'

interface DraftEntry {
  key: string
  value: string
  dataType: SettingDataType
  isSecret: boolean
  description?: string | null
  /** Definición del catálogo, si la variable proviene del esquema de la app. */
  definition?: SettingDefinition
  existing?: TenantAppSetting
}

const dataTypeLabels: Record<SettingDataType, string> = {
  String: 'Texto',
  Number: 'Número',
  Boolean: 'Sí / No',
  Json: 'JSON',
  Url: 'URL',
  Email: 'Correo',
  Secret: 'Secreto',
}

export function SettingsEditor({
  tenantId,
  tenantAppId,
  environment,
  schema,
  canManage,
}: {
  tenantId: string
  tenantAppId: string
  environment: AppEnvironment
  schema: SettingDefinition[]
  canManage: boolean
}) {
  const { data: settings, isPending } = useSettings(tenantId, tenantAppId, environment)
  const saveSettings = useSaveSettings(tenantId, tenantAppId)
  const deleteSetting = useDeleteSetting(tenantId, tenantAppId)

  const [draft, setDraft] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>()
  const [adding, setAdding] = useState(false)
  const [removingKey, setRemovingKey] = useState<TenantAppSetting>()
  const [extraKeys, setExtraKeys] = useState<DraftEntry[]>([])

  // Las variables del esquema mandan; las libres se añaden después conservando el orden.
  const entries = useMemo<DraftEntry[]>(() => {
    const byKey = new Map((settings ?? []).map((setting) => [setting.key, setting]))

    const fromSchema: DraftEntry[] = schema.map((definition) => {
      const existing = byKey.get(definition.key)
      byKey.delete(definition.key)

      return {
        key: definition.key,
        value: '',
        dataType: definition.dataType,
        isSecret: definition.isSecret,
        description: definition.description,
        definition,
        existing,
      }
    })

    const custom: DraftEntry[] = [...byKey.values()].map((setting) => ({
      key: setting.key,
      value: '',
      dataType: setting.dataType,
      isSecret: setting.isSecret,
      description: setting.description,
      existing: setting,
    }))

    return [...fromSchema, ...custom, ...extraKeys]
  }, [schema, settings, extraKeys])

  // El borrador se reconstruye solo cuando cambian los datos del servidor: si dependiera
  // también de las variables añadidas a mano, crear una borraría lo que se estaba editando.
  useEffect(() => {
    if (!settings) return

    const byKey = new Map(settings.map((setting) => [setting.key, setting]))
    const next: Record<string, string> = {}

    // Un secreto ya guardado llega enmascarado: se conserva la marca hasta que lo cambien.
    const valueOf = (setting: TenantAppSetting) =>
      setting.isSecret && setting.hasValue ? SECRET_PLACEHOLDER : (setting.value ?? '')

    for (const definition of schema) {
      const existing = byKey.get(definition.key)
      next[definition.key] = existing ? valueOf(existing) : (definition.defaultValue ?? '')
    }

    for (const setting of settings) {
      next[setting.key] ??= valueOf(setting)
    }

    setDraft(next)
    setExtraKeys([])
    setDirty(false)
  }, [settings, schema])

  const grouped = useMemo(() => {
    const groups = new Map<string, DraftEntry[]>()

    for (const entry of entries) {
      const group = entry.definition?.group ?? (entry.definition ? 'General' : 'Variables propias')
      const bucket = groups.get(group) ?? []
      bucket.push(entry)
      groups.set(group, bucket)
    }

    return [...groups.entries()]
  }, [entries])

  const missingRequired = entries.filter(
    (entry) => entry.definition?.isRequired && !draft[entry.key]?.trim(),
  )

  const update = (key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  const save = async () => {
    setErrors(undefined)

    try {
      await saveSettings.mutateAsync({
        environment,
        settings: entries.map((entry) => ({
          key: entry.key,
          value: draft[entry.key] ?? '',
          dataType: entry.dataType,
          isSecret: entry.isSecret,
          environment,
          description: entry.description ?? null,
        })),
      })

      toast.success('Configuración guardada', {
        description: `Entorno ${environmentMeta[environment].label}. Las apps la verán en su próxima consulta.`,
      })

      setExtraKeys([])
      setDirty(false)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        toast.error('No se pudo guardar', { description: error.message })
      }
    }
  }

  const confirmDelete = async () => {
    if (!removingKey) return

    try {
      await deleteSetting.mutateAsync(removingKey.id)
      toast.success('Variable eliminada')
      setRemovingKey(undefined)
    } catch (error) {
      toast.error('No se pudo eliminar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  if (isPending) {
    return (
      <Card>
        <p className="py-10 text-center text-[0.8438rem] text-ink-muted">Cargando configuración…</p>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState
          icon={<Variable className="size-5" />}
          title="Sin variables definidas"
          description="Esta app no declara variables en su esquema. Puede añadir variables propias para esta empresa."
          action={
            canManage && (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
                Añadir variable
              </Button>
            )
          }
        />
        <AddVariableModal
          open={adding}
          onClose={() => setAdding(false)}
          existingKeys={new Set(entries.map((entry) => entry.key))}
          onAdd={(entry) => {
            setExtraKeys((current) => [...current, entry])
            setDraft((current) => ({ ...current, [entry.key]: entry.value }))
            setDirty(true)
          }}
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-caution/40 bg-caution-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
          <p className="text-[0.8438rem] text-ink-soft">
            Faltan {missingRequired.length} variable(s) obligatoria(s):{' '}
            <span className="font-mono text-[0.78rem] text-ink">
              {missingRequired.map((entry) => entry.key).join(', ')}
            </span>
          </p>
        </div>
      )}

      <Card className="flex flex-col gap-6">
        <CardHeader
          title={`Variables · ${environmentMeta[environment].label}`}
          description={environmentMeta[environment].description}
          action={
            canManage && (
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
                Añadir variable
              </Button>
            )
          }
        />

        {grouped.map(([group, groupEntries]) => (
          <div key={group} className="flex flex-col gap-4">
            <SectionDivider>{group}</SectionDivider>

            {groupEntries.map((entry) => (
              <SettingField
                key={entry.key}
                entry={entry}
                value={draft[entry.key] ?? ''}
                error={errors?.[entry.key]?.[0]}
                disabled={!canManage}
                onChange={(value) => update(entry.key, value)}
                onReveal={
                  entry.existing?.isSecret && entry.existing.hasValue
                    ? async () => {
                        const result = await revealSetting(tenantId, tenantAppId, entry.existing!.id)
                        return result.value
                      }
                    : undefined
                }
                onDelete={
                  canManage && entry.existing && !entry.definition
                    ? () => setRemovingKey(entry.existing!)
                    : undefined
                }
              />
            ))}
          </div>
        ))}

        {canManage && (
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            {dirty && <span className="text-[0.8125rem] text-ink-muted">Hay cambios sin guardar</span>}

            <Button
              variant="ghost"
              icon={<RotateCcw className="size-4" />}
              disabled={!dirty || saveSettings.isPending}
              onClick={() => {
                setExtraKeys([])
                setDirty(false)
                setErrors(undefined)
              }}
            >
              Descartar
            </Button>

            <Button
              variant="primary"
              icon={<Save className="size-4" />}
              onClick={save}
              loading={saveSettings.isPending}
              disabled={!dirty}
            >
              Guardar configuración
            </Button>
          </div>
        )}
      </Card>

      <AddVariableModal
        open={adding}
        onClose={() => setAdding(false)}
        existingKeys={new Set(entries.map((entry) => entry.key))}
        onAdd={(entry) => {
          setExtraKeys((current) => [...current, entry])
          setDraft((current) => ({ ...current, [entry.key]: entry.value }))
          setDirty(true)
        }}
      />

      <ConfirmDialog
        open={Boolean(removingKey)}
        onClose={() => setRemovingKey(undefined)}
        onConfirm={confirmDelete}
        loading={deleteSetting.isPending}
        title="Eliminar variable"
        confirmLabel="Eliminar"
        description={
          <>
            Se eliminará <code className="font-mono text-ink">{removingKey?.key}</code> del entorno{' '}
            {environmentMeta[environment].label}. Las apps dejarán de recibirla.
          </>
        }
      />
    </div>
  )
}

// ── Campo según el tipo declarado ───────────────────────────────────────────

function SettingField({
  entry,
  value,
  error,
  disabled,
  onChange,
  onReveal,
  onDelete,
}: {
  entry: DraftEntry
  value: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
  onReveal?: () => Promise<string | null>
  onDelete?: () => void
}) {
  const [revealing, setRevealing] = useState(false)
  const definition = entry.definition
  const label = definition?.label ?? entry.key

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-soft">
        {entry.key}
      </code>
      <Badge tone="neutral" className="font-normal">
        {dataTypeLabels[entry.dataType]}
      </Badge>
      {definition?.isRequired && <Badge tone="critical">Obligatoria</Badge>}
      {!definition && <Badge tone="info">Propia</Badge>}
    </div>
  )

  const actions = (
    <div className="flex items-center gap-1">
      {onReveal && (
        <button
          type="button"
          disabled={revealing}
          onClick={async () => {
            if (value !== SECRET_PLACEHOLDER) {
              onChange(SECRET_PLACEHOLDER)
              return
            }

            setRevealing(true)
            try {
              onChange((await onReveal()) ?? '')
            } finally {
              setRevealing(false)
            }
          }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.75rem] text-ink-muted transition-colors hover:bg-inset hover:text-ink"
        >
          {value === SECRET_PLACEHOLDER ? (
            <>
              <Eye className="size-3.5" /> Revelar
            </>
          ) : (
            <>
              <EyeOff className="size-3.5" /> Ocultar
            </>
          )}
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${entry.key}`}
          className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-critical-soft hover:text-critical"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )

  const allowedValues = useMemo<string[] | null>(() => {
    if (!definition?.allowedValues) return null

    try {
      const parsed = JSON.parse(definition.allowedValues)
      return Array.isArray(parsed) ? parsed.map(String) : null
    } catch {
      return null
    }
  }, [definition])

  if (entry.dataType === 'Boolean') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          {header}
          {actions}
        </div>
        <Switch
          checked={value === 'true'}
          disabled={disabled}
          onChange={(checked) => onChange(String(checked))}
          label={label}
          description={definition?.description ?? undefined}
        />
        {error && <p className="text-[0.78rem] text-critical">{error}</p>}
      </div>
    )
  }

  const common = {
    label,
    hint: definition?.description ?? entry.description ?? undefined,
    error,
    disabled,
    action: (
      <div className="flex items-center gap-2">
        {header}
        {actions}
      </div>
    ),
  }

  if (allowedValues) {
    return (
      <Select
        {...common}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Sin valor</option>
        {allowedValues.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    )
  }

  if (entry.dataType === 'Json') {
    return (
      <Textarea
        {...common}
        rows={5}
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono text-[0.8125rem]"
        placeholder={definition?.placeholder ?? '{ }'}
      />
    )
  }

  return (
    <Input
      {...common}
      value={value}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
      placeholder={definition?.placeholder ?? (entry.isSecret ? 'Escriba el nuevo secreto' : '')}
      type={entry.dataType === 'Number' ? 'number' : 'text'}
      className={cn(
        (entry.isSecret || entry.dataType === 'Url') && 'font-mono text-[0.8125rem]',
      )}
      autoComplete="off"
    />
  )
}

// ── Alta de variable libre ──────────────────────────────────────────────────

function AddVariableModal({
  open,
  onClose,
  existingKeys,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  existingKeys: Set<string>
  onAdd: (entry: DraftEntry) => void
}) {
  const [key, setKey] = useState('')
  const [dataType, setDataType] = useState<SettingDataType>('String')
  const [isSecret, setIsSecret] = useState(false)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return

    setKey('')
    setDataType('String')
    setIsSecret(false)
    setDescription('')
  }, [open])

  const normalized = key.trim().toUpperCase().replace(/[^A-Z0-9_.:-]/g, '_')
  const duplicated = existingKeys.has(normalized)
  const valid = normalized.length > 0 && /^[A-Za-z_]/.test(normalized) && !duplicated

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva variable"
      description="Variables propias de esta empresa, fuera del esquema declarado por la app."
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              onAdd({
                key: normalized,
                value: '',
                dataType: isSecret ? 'Secret' : dataType,
                isSecret,
                description: description.trim() || null,
              })
              onClose()
            }}
          >
            Añadir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Input
          label="Clave"
          required
          autoFocus
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="SMTP_HOST"
          className="font-mono"
          error={duplicated ? 'Ya existe una variable con esa clave.' : undefined}
          hint={normalized && !duplicated ? `Se guardará como ${normalized}` : 'Mayúsculas, números, punto, guion y guion bajo.'}
        />

        <Select
          label="Tipo de dato"
          value={dataType}
          disabled={isSecret}
          onChange={(event) => setDataType(event.target.value as SettingDataType)}
        >
          {(['String', 'Number', 'Boolean', 'Json', 'Url', 'Email'] as SettingDataType[]).map((type) => (
            <option key={type} value={type}>
              {dataTypeLabels[type]}
            </option>
          ))}
        </Select>

        <Switch
          checked={isSecret}
          onChange={setIsSecret}
          label="Es un valor secreto"
          description="Se cifra en la base de datos y nunca se muestra sin pedirlo explícitamente."
        />

        <Input
          label="Descripción"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Para qué sirve esta variable"
        />
      </div>
    </Modal>
  )
}
