import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Ban,
  Download,
  KeyRound,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { CopyButton, DropdownMenu, EnvironmentPicker, EnvironmentTag, MenuItem, MenuSeparator, MonoValue } from '@/components/ui/Controls'
import { Badge, Card, CardHeader, EmptyState, Skeleton } from '@/components/ui/Primitives'
import {
  useCreateCredential,
  useCredentials,
  useDeleteCredential,
  useRevokeCredential,
  useRotateCredential,
} from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { copyToClipboard, credentialStatusMeta, formatDate, formatNumber, formatRelative } from '@/lib/utils'
import type { ApiCredential, ApiCredentialSecret, AppEnvironment } from '@/lib/types'

export function CredentialsPanel({
  tenantId,
  tenantAppId,
  appSlug,
  canManage,
}: {
  tenantId: string
  tenantAppId: string
  appSlug: string
  canManage: boolean
}) {
  const { data: credentials, isPending } = useCredentials(tenantId, tenantAppId)
  const rotateCredential = useRotateCredential(tenantId, tenantAppId)
  const revokeCredential = useRevokeCredential(tenantId, tenantAppId)
  const deleteCredential = useDeleteCredential(tenantId, tenantAppId)

  const [creating, setCreating] = useState(false)
  const [issued, setIssued] = useState<ApiCredentialSecret>()
  const [rotating, setRotating] = useState<ApiCredential>()
  const [revoking, setRevoking] = useState<ApiCredential>()
  const [deleting, setDeleting] = useState<ApiCredential>()
  const [revokeReason, setRevokeReason] = useState('')

  const confirmRotate = async () => {
    if (!rotating) return

    try {
      const result = await rotateCredential.mutateAsync(rotating.id)
      setRotating(undefined)
      setIssued(result)
    } catch (error) {
      toast.error('No se pudo rotar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  const confirmRevoke = async () => {
    if (!revoking) return

    try {
      await revokeCredential.mutateAsync({ credentialId: revoking.id, reason: revokeReason || undefined })
      toast.success('Credencial revocada', {
        description: 'Las integraciones que la usaran dejarán de recibir configuración.',
      })
      setRevoking(undefined)
      setRevokeReason('')
    } catch (error) {
      toast.error('No se pudo revocar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return

    try {
      await deleteCredential.mutateAsync(deleting.id)
      toast.success('Credencial eliminada')
      setDeleting(undefined)
    } catch (error) {
      toast.error('No se pudo eliminar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  if (isPending) return <Skeleton className="h-64 w-full rounded-xl" />

  return (
    <div className="flex flex-col gap-4">
      <Card padded={false}>
        <div className="px-5 pt-5 pb-4">
          <CardHeader
            title="Credenciales de integración"
            description="Cada credencial identifica a una app en un entorno. El secreto solo se muestra al emitirla o rotarla."
            action={
              canManage && (
                <Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                  Emitir credencial
                </Button>
              )
            }
          />
        </div>

        {!credentials?.length ? (
          <EmptyState
            icon={<KeyRound className="size-5" />}
            title="Sin credenciales emitidas"
            description="La app no podrá leer su configuración hasta que reciba un par api key / secreto."
            action={
              canManage && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                  Emitir credencial
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {credentials.map((credential) => {
              const statusMeta = credentialStatusMeta[credential.status]
              const expiringSoon =
                credential.status === 'Active' &&
                credential.expiresAt !== null &&
                credential.expiresAt !== undefined &&
                new Date(credential.expiresAt).getTime() - Date.now() < 30 * 86_400_000

              return (
                <li key={credential.id} className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <EnvironmentTag environment={credential.environment} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-ink">
                        {credential.name}
                      </span>
                      <span className="block truncate text-[0.75rem] text-ink-muted">
                        Creada {formatDate(credential.createdAt)}
                        {credential.lastUsedAt
                          ? ` · último uso ${formatRelative(credential.lastUsedAt)}`
                          : ' · sin uso registrado'}
                        {` · ${formatNumber(credential.usageCount)} llamadas`}
                      </span>
                    </span>

                    <Badge tone={statusMeta.tone} dot>
                      {statusMeta.label}
                    </Badge>

                    {expiringSoon && <Badge tone="caution">Caduca {formatRelative(credential.expiresAt)}</Badge>}

                    {canManage && (
                      <DropdownMenu
                        trigger={({ toggle }) => (
                          <Button size="icon" variant="ghost" onClick={toggle} aria-label={`Acciones de ${credential.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        )}
                      >
                        {(close) => (
                          <>
                            <MenuItem
                              icon={<RefreshCw className="size-4" />}
                              disabled={credential.status === 'Revoked'}
                              onClick={() => {
                                close()
                                setRotating(credential)
                              }}
                            >
                              Rotar claves
                            </MenuItem>

                            <MenuItem
                              icon={<Ban className="size-4" />}
                              disabled={credential.status === 'Revoked'}
                              onClick={() => {
                                close()
                                setRevoking(credential)
                              }}
                            >
                              Revocar
                            </MenuItem>

                            <MenuSeparator />

                            <MenuItem
                              tone="danger"
                              icon={<Trash2 className="size-4" />}
                              onClick={() => {
                                close()
                                setDeleting(credential)
                              }}
                            >
                              Eliminar del registro
                            </MenuItem>
                          </>
                        )}
                      </DropdownMenu>
                    )}
                  </div>

                  <dl className="grid gap-2 text-[0.75rem] sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <dt className="shrink-0 text-ink-muted">Client ID</dt>
                      <dd className="min-w-0">
                        <MonoValue value={credential.clientId} copyValue={credential.clientId} />
                      </dd>
                    </div>

                    <div className="flex items-center gap-2">
                      <dt className="shrink-0 text-ink-muted">Api key</dt>
                      <dd className="min-w-0">
                        <MonoValue value={credential.maskedApiKey} tone="muted" />
                      </dd>
                    </div>

                    <div className="flex items-center gap-2">
                      <dt className="shrink-0 text-ink-muted">Secreto</dt>
                      <dd className="min-w-0">
                        <MonoValue value={credential.maskedSecret} tone="muted" />
                      </dd>
                    </div>
                  </dl>

                  {credential.status === 'Revoked' && credential.revokedReason && (
                    <p className="text-[0.75rem] text-ink-muted">
                      Motivo de la revocación: {credential.revokedReason}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <CreateCredentialModal
        tenantId={tenantId}
        tenantAppId={tenantAppId}
        open={creating}
        onClose={() => setCreating(false)}
        onIssued={setIssued}
      />

      <SecretRevealModal
        result={issued}
        appSlug={appSlug}
        onClose={() => setIssued(undefined)}
      />

      <ConfirmDialog
        open={Boolean(rotating)}
        onClose={() => setRotating(undefined)}
        onConfirm={confirmRotate}
        loading={rotateCredential.isPending}
        title="Rotar claves"
        confirmLabel="Rotar"
        description={
          <>
            Se generará un par nuevo para <strong className="text-ink">{rotating?.name}</strong>.{' '}
            <strong className="text-ink">Las claves actuales dejarán de funcionar de inmediato</strong>,
            así que actualice la app antes de rotar en producción.
          </>
        }
      />

      <Modal
        open={Boolean(revoking)}
        onClose={() => setRevoking(undefined)}
        title="Revocar credencial"
        description="La revocación es permanente. Para seguir operando habrá que emitir una credencial nueva."
        width="sm"
        locked={revokeCredential.isPending}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(undefined)} disabled={revokeCredential.isPending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmRevoke} loading={revokeCredential.isPending}>
              Revocar
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo"
          rows={3}
          value={revokeReason}
          onChange={(event) => setRevokeReason(event.target.value)}
          placeholder="Filtración sospechada, rotación programada, baja del proveedor…"
          hint="Queda registrado en la auditoría junto con la credencial."
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={confirmDelete}
        loading={deleteCredential.isPending}
        title="Eliminar credencial"
        confirmLabel="Eliminar"
        description={
          <>
            Se borrará <strong className="text-ink">{deleting?.name}</strong> del registro. Si aún
            estaba activa, la app perderá el acceso. Considere revocarla en su lugar para conservar
            la traza.
          </>
        }
      />
    </div>
  )
}

function CreateCredentialModal({
  tenantId,
  tenantAppId,
  open,
  onClose,
  onIssued,
}: {
  tenantId: string
  tenantAppId: string
  open: boolean
  onClose: () => void
  onIssued: (result: ApiCredentialSecret) => void
}) {
  const createCredential = useCreateCredential(tenantId, tenantAppId)

  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<AppEnvironment>('Development')
  const [scopes, setScopes] = useState('')
  const [allowedIps, setAllowedIps] = useState('')
  const [expiry, setExpiry] = useState('')

  useEffect(() => {
    if (!open) return

    setName('')
    setEnvironment('Development')
    setScopes('')
    setAllowedIps('')
    setExpiry('')
  }, [open])

  const submit = async () => {
    try {
      const result = await createCredential.mutateAsync({
        name: name.trim(),
        environment,
        scopes: scopes.trim() || null,
        allowedIps: allowedIps.trim() || null,
        expiresAt: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null,
      })

      onClose()
      onIssued(result)
    } catch (error) {
      toast.error('No se pudo emitir la credencial', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Emitir credencial"
      description="El par api key / secreto se mostrará una sola vez al terminar."
      locked={createCredential.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={createCredential.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={createCredential.isPending}
            disabled={name.trim().length === 0}
          >
            Emitir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Input
          label="Nombre"
          required
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Servidor de producción · Bogotá"
          hint="Un nombre que permita identificar dónde está instalada."
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-ink-soft">Entorno</span>
          <EnvironmentPicker value={environment} onChange={setEnvironment} />
          <p className="text-[0.78rem] text-ink-muted">
            La credencial solo recibirá las variables de este entorno.
          </p>
        </div>

        <Input
          label="Scopes"
          value={scopes}
          onChange={(event) => setScopes(event.target.value)}
          placeholder="config.read orders.write"
          className="font-mono text-[0.8125rem]"
          hint="Separados por espacios. Si se deja vacío hereda los de la suscripción."
        />

        <Textarea
          label="IPs permitidas"
          rows={2}
          value={allowedIps}
          onChange={(event) => setAllowedIps(event.target.value)}
          placeholder={'190.0.0.10\n10.0.0.0/24'}
          className="font-mono text-[0.8125rem]"
          hint="Una por línea. Admite CIDR. Vacío significa sin restricción de origen."
        />

        <Input
          label="Caduca el"
          type="date"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value)}
          hint="Opcional. Una credencial con caducidad obliga a rotarla periódicamente."
        />
      </div>
    </Modal>
  )
}

/** La única pantalla donde la api key y el secreto existen en claro. */
function SecretRevealModal({
  result,
  appSlug,
  onClose,
}: {
  result?: ApiCredentialSecret
  appSlug: string
  onClose: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => setAcknowledged(false), [result])

  if (!result) return null

  const envFile = [
    `# ${appSlug} · ${result.credential.environment}`,
    `ONE_API_URL=${window.location.origin}/api/v1/integration/config`,
    `ONE_CLIENT_ID=${result.credential.clientId}`,
    `ONE_API_KEY=${result.apiKey}`,
    `ONE_API_SECRET=${result.apiSecret}`,
  ].join('\n')

  const download = () => {
    const blob = new Blob([`${envFile}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${appSlug}-${result.credential.environment.toLowerCase()}.env`
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <Modal
      open
      onClose={onClose}
      locked={!acknowledged}
      title="Guarde estas credenciales ahora"
      description={result.warning}
      footer={
        <>
          <Button icon={<Download className="size-4" />} onClick={download}>
            Descargar .env
          </Button>
          <Button variant="primary" onClick={onClose} disabled={!acknowledged}>
            Ya las guardé
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 rounded-xl border border-caution/40 bg-caution-soft px-4 py-3">
          <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-caution" aria-hidden />
          <p className="text-[0.8438rem] leading-relaxed text-ink-soft">
            El secreto no se guarda en claro: en la base solo queda su hash. Si lo pierde, la única
            salida es rotar la credencial.
          </p>
        </div>

        <SecretRow label="Client ID" value={result.credential.clientId} />
        <SecretRow label="Api key" value={result.apiKey} />
        <SecretRow label="Secreto" value={result.apiSecret} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] font-medium text-ink-soft">Archivo .env</span>
            <CopyButton value={envFile} label="Copiar bloque" size="inline" />
          </div>
          <pre className="overflow-x-auto rounded-lg border border-line bg-inset px-3 py-2.5 font-mono text-[0.75rem] leading-relaxed text-ink-soft">
            {envFile}
          </pre>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-inset/50 px-3.5 py-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span className="text-[0.8438rem] text-ink-soft">
            Confirmo que copié la api key y el secreto en un lugar seguro.
          </span>
        </label>
      </div>
    </Modal>
  )
}

function SecretRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] font-medium text-ink-soft">{label}</span>
        <button
          type="button"
          onClick={async () => {
            if (await copyToClipboard(value)) toast.success(`${label} copiado`)
          }}
          className="text-[0.75rem] text-accent transition-opacity hover:opacity-80"
        >
          Copiar
        </button>
      </div>
      <code className="overflow-x-auto rounded-lg border border-line bg-inset px-3 py-2 font-mono text-[0.8125rem] text-ink select-all">
        {value}
      </code>
    </div>
  )
}
