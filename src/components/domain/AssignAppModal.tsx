import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Switch } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Avatar, Badge } from '@/components/ui/Primitives'
import { EnvironmentPicker } from '@/components/ui/Controls'
import { useApps, useAssignApp } from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useDebounced } from '@/lib/useDebounced'
import type { AppEnvironment } from '@/lib/types'

export function AssignAppModal({
  tenantId,
  open,
  onClose,
  assignedAppIds,
}: {
  tenantId: string
  open: boolean
  onClose: () => void
  assignedAppIds: Set<string>
}) {
  const navigate = useNavigate()
  const assignApp = useAssignApp(tenantId)

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string>()
  const [seedSettings, setSeedSettings] = useState(true)
  const [createCredential, setCreateCredential] = useState(true)
  const [environment, setEnvironment] = useState<AppEnvironment>('Development')

  const debouncedSearch = useDebounced(search, 250)
  const { data, isPending } = useApps({
    page: 1,
    pageSize: 50,
    search: debouncedSearch || undefined,
    isActive: true,
  })

  useEffect(() => {
    if (!open) return

    setSearch('')
    setSelected(undefined)
    setSeedSettings(true)
    setCreateCredential(true)
    setEnvironment('Development')
  }, [open])

  const available = useMemo(
    () => data?.items.filter((app) => !assignedAppIds.has(app.id)) ?? [],
    [data, assignedAppIds],
  )

  const submit = async () => {
    if (!selected) return

    try {
      const subscription = await assignApp.mutateAsync({
        appId: selected,
        seedDefaultSettings: seedSettings,
        createCredentialForEnvironment: createCredential ? environment : null,
      })

      toast.success('Aplicación asignada', {
        description: 'Configure sus variables y entregue la credencial al equipo técnico.',
      })

      onClose()
      navigate(`/empresas/${tenantId}/apps/${subscription.id}`)
    } catch (error) {
      toast.error('No se pudo asignar la aplicación', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar aplicación"
      description="Elija una app del catálogo. La empresa recibirá su propio conjunto de variables y credenciales."
      width="lg"
      locked={assignApp.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={assignApp.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={assignApp.isPending} disabled={!selected}>
            Asignar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar en el catálogo…"
          leading={<Search className="size-4" />}
          aria-label="Buscar aplicaciones"
        />

        <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
          {isPending ? (
            <p className="px-4 py-8 text-center text-[0.8438rem] text-ink-muted">Cargando catálogo…</p>
          ) : available.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.8438rem] text-ink-muted">
              {data?.items.length
                ? 'La empresa ya tiene asignadas todas las apps que coinciden con la búsqueda.'
                : 'No hay aplicaciones activas en el catálogo.'}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {available.map((app) => {
                const isSelected = app.id === selected

                return (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(app.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors',
                        isSelected ? 'bg-accent-soft' : 'hover:bg-inset',
                      )}
                    >
                      <Avatar name={app.name} src={app.iconUrl} color={app.color} square />

                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-[0.875rem] font-medium text-ink">
                          {app.name}
                          {app.category && (
                            <Badge tone="neutral" className="font-normal">
                              {app.category}
                            </Badge>
                          )}
                        </p>
                        <p className="truncate text-[0.78rem] text-ink-muted">
                          {app.description || app.slug}
                        </p>
                      </div>

                      <span className="shrink-0 text-[0.75rem] text-ink-muted tabular">
                        {app.settingCount} var.
                      </span>

                      {isSelected && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-line bg-inset/50 p-4">
          <Switch
            checked={seedSettings}
            onChange={setSeedSettings}
            label="Precargar las variables del esquema"
            description="Crea las variables que declara la app con sus valores por defecto, listas para completar."
          />

          <Switch
            checked={createCredential}
            onChange={setCreateCredential}
            label="Emitir una credencial inicial"
            description="Genera un par api key / secreto para el entorno elegido. Podrá consultarlo en la ficha de la app."
          />

          {createCredential && (
            <div className="flex flex-wrap items-center gap-3 pl-12.5">
              <span className="text-[0.8125rem] text-ink-soft">Entorno:</span>
              <EnvironmentPicker value={environment} onChange={setEnvironment} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
