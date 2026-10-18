import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { Download, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/Controls'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Badge, Card, CardHeader, Skeleton } from '@/components/ui/Primitives'
import { api, ApiError } from '@/lib/api'
import type { RecoveryCodes, TwoFactorSetup, TwoFactorStatus } from '@/lib/types'

/**
 * Verificación en dos pasos con una app de autenticación: Google Authenticator, Microsoft
 * Authenticator o Authy, en Android o iOS. Se activa escaneando un QR y confirmando el primer
 * código; desde entonces el login pide, además de la contraseña, el código de seis dígitos.
 */
export function TwoFactorCard() {
  const [status, setStatus] = useState<TwoFactorStatus>()
  const [setup, setSetup] = useState<TwoFactorSetup>()
  const [codes, setCodes] = useState<string[]>()
  const [asking, setAsking] = useState<'regenerate' | 'disable'>()
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      setStatus(await api.get<TwoFactorStatus>('/auth/2fa'))
    } catch (error) {
      toast.error('No se pudo leer la verificación en dos pasos', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const begin = async () => {
    setBusy(true)
    try {
      setSetup(await api.post<TwoFactorSetup>('/auth/2fa/setup'))
    } catch (error) {
      toast.error('No se pudo empezar la configuración', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader
        title="Verificación en dos pasos"
        description="Además de la contraseña, al entrar se pide un código de una app en su teléfono."
        action={
          status &&
          (status.enabled ? (
            <Badge tone="positive" dot>
              Activa
            </Badge>
          ) : (
            <Badge tone="neutral">Inactiva</Badge>
          ))
        }
      />

      {!status ? (
        <Skeleton className="h-16" />
      ) : status.enabled ? (
        <>
          <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
            Su cuenta pide el código de la app al iniciar sesión. Le quedan{' '}
            <strong className="text-ink">{status.recoveryCodesLeft}</strong> códigos de recuperación para
            entrar si no tiene el teléfono.
          </p>
          {status.recoveryCodesLeft <= 3 && (
            <p className="rounded-lg bg-caution-soft px-3 py-2 text-[0.8125rem] text-caution">
              Le quedan pocos códigos de recuperación. Genere unos nuevos y guárdelos.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" icon={<ShieldOff className="size-4" />} onClick={() => setAsking('disable')}>
              Desactivar
            </Button>
            <Button variant="secondary" onClick={() => setAsking('regenerate')}>
              Generar nuevos códigos de recuperación
            </Button>
          </div>
        </>
      ) : setup ? (
        <SetupStep
          setup={setup}
          onCancel={() => setSetup(undefined)}
          onEnabled={(recovery) => {
            setSetup(undefined)
            setCodes(recovery)
            void load()
          }}
        />
      ) : (
        <>
          <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-soft">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            Necesita una app de autenticación en su teléfono, como Google Authenticator o Microsoft
            Authenticator (Android y iOS). Funciona sin conexión y no tiene costo.
          </p>
          <div className="flex justify-end border-t border-line pt-4">
            <Button variant="primary" icon={<ShieldCheck className="size-4" />} onClick={begin} loading={busy}>
              Activar
            </Button>
          </div>
        </>
      )}

      <AskModal
        mode={asking}
        onClose={() => setAsking(undefined)}
        onDone={(recovery) => {
          setAsking(undefined)
          if (recovery) setCodes(recovery)
          void load()
        }}
      />
      <RecoveryCodesModal codes={codes} onClose={() => setCodes(undefined)} />
    </Card>
  )
}

function SetupStep({
  setup,
  onCancel,
  onEnabled,
}: {
  setup: TwoFactorSetup
  onCancel: () => void
  onEnabled: (codes: string[]) => void
}) {
  const [qr, setQr] = useState<string>()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // El QR se dibuja aquí, en el navegador: la clave no sale hacia ningún servicio externo.
    QRCode.toDataURL(setup.authenticatorUri, { width: 200, margin: 1 })
      .then(setQr)
      .catch(() => setQr(undefined))
  }, [setup.authenticatorUri])

  const confirm = async () => {
    setError(undefined)
    setSaving(true)
    try {
      const result = await api.post<RecoveryCodes>('/auth/2fa/enable', { code })
      toast.success('Verificación en dos pasos activada')
      onEnabled(result.codes)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo activar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">
        <li>1. Abra la app de autenticación en su teléfono y agregue una cuenta nueva.</li>
        <li>2. Escanee este código QR.</li>
        <li>3. Escriba el código de seis dígitos que le muestra la app.</li>
      </ol>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="flex size-[200px] shrink-0 items-center justify-center rounded-xl bg-white p-2">
          {qr ? <img src={qr} alt="Código QR para la app de autenticación" className="size-full" /> : <Skeleton className="size-full" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[0.75rem] text-ink-muted">¿No puede escanear? Escriba esta clave en la app:</p>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-inset px-3 py-2">
            <code className="min-w-0 flex-1 font-mono text-[0.8125rem] break-all text-ink">{setup.sharedKey}</code>
            <CopyButton value={setup.sharedKey.replace(/\s/g, '')} />
          </div>
          <Input
            label="Código de la app"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123 456"
            error={error}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={confirm} loading={saving} disabled={code.replace(/\D/g, '').length !== 6}>
          Confirmar y activar
        </Button>
      </div>
    </div>
  )
}

/** Generar códigos nuevos pide un código de la app; desactivar, la contraseña. */
function AskModal({
  mode,
  onClose,
  onDone,
}: {
  mode?: 'regenerate' | 'disable'
  onClose: () => void
  onDone: (codes?: string[]) => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue('')
    setError(undefined)
  }, [mode])

  if (!mode) return null

  const submit = async () => {
    setError(undefined)
    setSaving(true)
    try {
      if (mode === 'regenerate') {
        const result = await api.post<RecoveryCodes>('/auth/2fa/recovery-codes', { code: value })
        onDone(result.codes)
      } else {
        await api.post('/auth/2fa/disable', { password: value })
        toast.success('Verificación en dos pasos desactivada')
        onDone()
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar.')
    } finally {
      setSaving(false)
    }
  }

  const regenerate = mode === 'regenerate'

  return (
    <Modal
      open
      onClose={onClose}
      width="sm"
      locked={saving}
      title={regenerate ? 'Generar nuevos códigos de recuperación' : 'Desactivar la verificación en dos pasos'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant={regenerate ? 'primary' : 'danger'} onClick={submit} loading={saving} disabled={!value}>
            {regenerate ? 'Generar' : 'Desactivar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
          {regenerate
            ? 'Los códigos anteriores dejarán de servir. Escriba el código que muestra ahora la app.'
            : 'Su cuenta volverá a pedir solo la contraseña, y la cuenta de la app dejará de servir. Confirme con su contraseña.'}
        </p>
        <Input
          label={regenerate ? 'Código de la app' : 'Contraseña'}
          type={regenerate ? 'text' : 'password'}
          inputMode={regenerate ? 'numeric' : undefined}
          autoComplete={regenerate ? 'one-time-code' : 'current-password'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={error}
        />
      </div>
    </Modal>
  )
}

/** Se muestran una sola vez: después solo se puede generar una lista nueva. */
function RecoveryCodesModal({ codes, onClose }: { codes?: string[]; onClose: () => void }) {
  if (!codes) return null

  const text = codes.join('\n')

  const download = () => {
    const blob = new Blob([`Códigos de recuperación de Intechsys One\n\n${text}\n`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'intechsys-one-codigos-de-recuperacion.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="sm"
      title="Guarde sus códigos de recuperación"
      footer={
        <>
          <Button variant="ghost" icon={<Download className="size-4" />} onClick={download}>
            Descargar
          </Button>
          <Button variant="primary" onClick={onClose}>
            Ya los guardé
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
          Si pierde el teléfono, entre con uno de estos códigos en lugar del de la app. Cada uno sirve una
          sola vez y no se volverán a mostrar.
        </p>
        <ul className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-inset p-3 font-mono text-[0.8125rem] text-ink">
          {codes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="flex justify-end">
          <CopyButton value={text} size="inline" label="Copiar todos" />
        </div>
      </div>
    </Modal>
  )
}
