import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  KeyRound,
  Save,
  Settings2,
  SlidersHorizontal,
  Terminal,
  Trash2,
  Variable,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/AppShell'
import { CredentialsPanel } from '@/components/domain/CredentialsPanel'
import { SettingsEditor } from '@/components/domain/SettingsEditor'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/Modal'
import { CopyButton, EnvironmentPicker, Tabs } from '@/components/ui/Controls'
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Skeleton } from '@/components/ui/Primitives'
import { useRemoveTenantApp, useTenantApp, useUpdateTenantApp } from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import type { AppEnvironment, SubscriptionStatus } from '@/lib/types'

type TabId = 'variables' | 'credenciales' | 'ajustes' | 'integrar'

export function TenantAppPage() {
  const { tenantId = '', tenantAppId = '' } = useParams()
  const navigate = useNavigate()
  const { canManageTenant } = useAuth()

  const [tab, setTab] = useState<TabId>('variables')
  const [environment, setEnvironment] = useState<AppEnvironment>('Production')
  const [removing, setRemoving] = useState(false)

  const { data, isPending, error } = useTenantApp(tenantId, tenantAppId)
  const removeApp = useRemoveTenantApp(tenantId)
  const canManage = canManageTenant(tenantId)

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Asignación no encontrada"
        description="La app pudo retirarse de esta empresa."
        action={<Button onClick={() => navigate(`/empresas/${tenantId}`)}>Volver a la empresa</Button>}
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

  const { subscription, schema } = data

  const remove = async () => {
    try {
      await removeApp.mutateAsync(tenantAppId)
      toast.success('Aplicación retirada', {
        description: 'Se eliminaron sus variables y credenciales para esta empresa.',
      })
      navigate(`/empresas/${tenantId}`)
    } catch (caught) {
      toast.error('No se pudo retirar', {
        description: caught instanceof ApiError ? caught.message : undefined,
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Empresas', to: '/empresas' },
              { label: subscription.tenantName, to: `/empresas/${tenantId}` },
              { label: subscription.appName },
            ]}
          />
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar
              name={subscription.appName}
              src={subscription.appIconUrl}
              color={subscription.appColor}
              size="lg"
              square
            />
            <span>{subscription.displayName || subscription.appName}</span>
            {subscription.isEnabled && subscription.status === 'Active' ? (
              <Badge tone="positive" dot>
                Activa
              </Badge>
            ) : (
              <Badge tone="caution" dot>
                Deshabilitada
              </Badge>
            )}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.75rem]">
            <span>{subscription.appSlug}</span>
            <span>alta: {formatDate(subscription.subscribedAt)}</span>
            {subscription.expiresAt && <span>caduca: {formatDate(subscription.expiresAt)}</span>}
          </span>
        }
        actions={
          tab === 'variables' && (
            <EnvironmentPicker value={environment} onChange={setEnvironment} />
          )
        }
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        items={[
          { id: 'variables', label: 'Variables', icon: <Variable className="size-4" /> },
          { id: 'credenciales', label: 'Credenciales', icon: <KeyRound className="size-4" /> },
          { id: 'integrar', label: 'Cómo integrar', icon: <Terminal className="size-4" /> },
          { id: 'ajustes', label: 'Ajustes', icon: <SlidersHorizontal className="size-4" /> },
        ]}
      />

      {tab === 'variables' && (
        <SettingsEditor
          tenantId={tenantId}
          tenantAppId={tenantAppId}
          environment={environment}
          schema={schema}
          canManage={canManage}
        />
      )}

      {tab === 'credenciales' && (
        <CredentialsPanel
          tenantId={tenantId}
          tenantAppId={tenantAppId}
          appSlug={subscription.appSlug}
          canManage={canManage}
        />
      )}

      {tab === 'integrar' && <IntegrationGuide appSlug={subscription.appSlug} />}

      {tab === 'ajustes' && (
        <SubscriptionSettings
          tenantId={tenantId}
          tenantAppId={tenantAppId}
          canManage={canManage}
          onRemove={() => setRemoving(true)}
        />
      )}

      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={remove}
        loading={removeApp.isPending}
        title="Retirar aplicación"
        confirmLabel="Retirar"
        description={
          <>
            Se eliminarán <strong className="text-ink">todas las variables y credenciales</strong> de{' '}
            {subscription.appName} para {subscription.tenantName}. La acción no se puede deshacer.
          </>
        }
      />
    </div>
  )
}

// ── Ajustes de la suscripción ───────────────────────────────────────────────

function SubscriptionSettings({
  tenantId,
  tenantAppId,
  canManage,
  onRemove,
}: {
  tenantId: string
  tenantAppId: string
  canManage: boolean
  onRemove: () => void
}) {
  const { data } = useTenantApp(tenantId, tenantAppId)
  const updateApp = useUpdateTenantApp(tenantId, tenantAppId)

  const [displayName, setDisplayName] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)
  const [status, setStatus] = useState<SubscriptionStatus>('Active')
  const [expiresAt, setExpiresAt] = useState('')
  const [grantedScopes, setGrantedScopes] = useState('')
  const [allowedOrigins, setAllowedOrigins] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!data) return

    const { subscription } = data
    setDisplayName(subscription.displayName ?? '')
    setIsEnabled(subscription.isEnabled)
    setStatus(subscription.status)
    setExpiresAt(subscription.expiresAt ? subscription.expiresAt.slice(0, 10) : '')
    setGrantedScopes(subscription.grantedScopes ?? '')
    setAllowedOrigins(subscription.allowedOrigins ?? '')
    setWebhookUrl(subscription.webhookUrl ?? '')
    setNotes(subscription.notes ?? '')
    setDirty(false)
  }, [data])

  const save = async () => {
    try {
      await updateApp.mutateAsync({
        displayName: displayName.trim() || null,
        isEnabled,
        status,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
        grantedScopes: grantedScopes.trim() || null,
        allowedOrigins: allowedOrigins.trim() || null,
        webhookUrl: webhookUrl.trim() || null,
        notes: notes.trim() || null,
      })

      toast.success('Ajustes guardados')
      setDirty(false)
    } catch (error) {
      toast.error('No se pudieron guardar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  const track = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setDirty(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <CardHeader
          title="Ajustes de la asignación"
          description="Controlan si la app puede leer su configuración y con qué permisos."
        />

        <fieldset disabled={!canManage} className="contents">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre para esta empresa"
              value={displayName}
              onChange={(event) => track(setDisplayName)(event.target.value)}
              placeholder={data?.subscription.appName}
              hint="Alias interno. Si se deja vacío se usa el nombre del catálogo."
            />

            <Select
              label="Estado de la suscripción"
              value={status}
              onChange={(event) => track(setStatus)(event.target.value as SubscriptionStatus)}
            >
              <option value="Active">Activa</option>
              <option value="Paused">Pausada</option>
              <option value="Expired">Caducada</option>
              <option value="Cancelled">Cancelada</option>
            </Select>

            <Input
              label="Caduca el"
              type="date"
              value={expiresAt}
              onChange={(event) => track(setExpiresAt)(event.target.value)}
              hint="Al vencer, la app deja de recibir configuración."
            />

            <Input
              label="Scopes concedidos"
              value={grantedScopes}
              onChange={(event) => track(setGrantedScopes)(event.target.value)}
              placeholder="config.read orders.write"
              className="font-mono text-[0.8125rem]"
            />
          </div>

          <Switch
            checked={isEnabled}
            onChange={track(setIsEnabled)}
            label="Aplicación habilitada"
            description="Si se desactiva, las credenciales siguen existiendo pero el API responde 403."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea
              label="Orígenes permitidos"
              rows={3}
              value={allowedOrigins}
              onChange={(event) => track(setAllowedOrigins)(event.target.value)}
              placeholder={'https://app.empresa.com\nhttps://admin.empresa.com'}
              className="font-mono text-[0.8125rem]"
              hint="Uno por línea. Se entregan a la app en su configuración."
            />

            <Textarea
              label="Notas"
              rows={3}
              value={notes}
              onChange={(event) => track(setNotes)(event.target.value)}
              placeholder="Contacto técnico, particularidades del despliegue…"
            />
          </div>

          <Input
            label="Webhook de cambios"
            value={webhookUrl}
            onChange={(event) => track(setWebhookUrl)(event.target.value)}
            placeholder="https://app.empresa.com/hooks/one-config"
            className="font-mono text-[0.8125rem]"
            hint="URL a la que notificar cuando cambie la configuración."
          />
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
              Guardar ajustes
            </Button>
          </div>
        )}
      </Card>

      {canManage && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-critical/30">
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-ink">Retirar la aplicación</h3>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Elimina la asignación junto con sus variables y credenciales. No afecta al catálogo.
            </p>
          </div>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={onRemove}>
            Retirar
          </Button>
        </Card>
      )}
    </div>
  )
}

// ── Guía de integración ─────────────────────────────────────────────────────

function IntegrationGuide({ appSlug }: { appSlug: string }) {
  const origin = window.location.origin

  const curl = `curl "${origin}/api/v1/integration/config" \\
  -H "X-Api-Key: $ONE_API_KEY" \\
  -H "X-Api-Secret: $ONE_API_SECRET"`

  const csharp = `using var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
client.DefaultRequestHeaders.Add("X-Api-Secret", apiSecret);

var config = await client.GetFromJsonAsync<AppConfiguration>(
    "${origin}/api/v1/integration/config");

// config.Settings["${'API_BASE_URL'}"] trae el valor de la empresa dueña de la credencial.`

  const response = `{
  "tenant":   { "slug": "acme-logistica", "name": "Acme Logística", "status": "Active" },
  "app":      { "slug": "${appSlug}", "version": "1.0.0" },
  "environment": "Production",
  "clientId": "one_live_…",
  "scopes":   ["config.read"],
  "settings": { "API_BASE_URL": "https://erp.acme.co/api", "ERP_TOKEN": "…" },
  "configVersion": "4e092aec929df7bd"
}`

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <CardHeader
          title="Cómo lee la app su configuración"
          description="Una sola llamada autenticada con la api key y el secreto devuelve la empresa, el entorno y todas las variables ya descifradas."
        />

        <ol className="flex flex-col gap-3 text-[0.8438rem] leading-relaxed text-ink-soft">
          <Step number={1}>
            Emita una credencial en la pestaña <strong className="text-ink">Credenciales</strong> y
            guárdela en el gestor de secretos del despliegue.
          </Step>
          <Step number={2}>
            Llame a <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[0.75rem]">GET /api/v1/integration/config</code>{' '}
            al arrancar la app y cachee la respuesta.
          </Step>
          <Step number={3}>
            Revalide usando la cabecera{' '}
            <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[0.75rem]">X-Config-Version</code>:
            si no cambió, la configuración sigue siendo la misma.
          </Step>
        </ol>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock title="curl" code={curl} />
        <CodeBlock title="C# · HttpClient" code={csharp} />
      </div>

      <CodeBlock title="Respuesta" code={response} />
    </div>
  )
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-[0.75rem] font-semibold text-accent">
        {number}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink-soft">
          <Settings2 className="size-3.5 text-ink-muted" aria-hidden />
          {title}
        </span>
        <CopyButton value={code} label="Copiar código" size="inline" />
      </div>

      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.75rem] leading-relaxed text-ink-soft">
        {code}
      </pre>
    </Card>
  )
}
