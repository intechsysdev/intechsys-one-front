import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Primitives'
import { api, ApiError } from '@/lib/api'
import type { SsoAuthorizeResponse } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Marca de "ya se eligió la cuenta" para esta autorización. "Usar otra cuenta" cierra la sesión
 * y el login trae de vuelta aquí con la misma dirección; sin la marca se volvería a preguntar
 * con qué cuenta seguir a quien acaba de entrar justamente para eso.
 */
const CUENTA_ELEGIDA = 'one.sso.cuentaElegida'

/**
 * Punto de autorización del SSO. Una app manda aquí al usuario con los parámetros de OAuth 2.0
 * (client_id, redirect_uri, code_challenge, state). Si ya hay sesión se pide el código y se
 * devuelve al usuario a la app al instante; si no, la ruta está protegida y el login trae de
 * vuelta aquí al terminar.
 *
 * Con tenant_hint (una app en la que se entra con un código propio, como un Client ID) One busca
 * la empresa cuya variable identificadora tiene ese valor y la devuelve en `tenant`.
 *
 * Con prompt=select_account (lo manda la app desde su propio login, cuando alguien acaba de
 * salir) primero se pregunta con qué cuenta seguir, en vez de entrar en silencio con la que
 * tenga abierta el portal.
 *
 * La redirección solo ocurre después de que el API aceptó la dirección de retorno: esta página
 * nunca manda al usuario a una URL que la app no haya registrado en el catálogo.
 */
export function AuthorizePage() {
  const [params] = useSearchParams()
  const { user, logout } = useAuth()
  const [failure, setFailure] = useState<string>()
  const requested = useRef(false)

  const incomplete = !params.get('client_id') || !params.get('redirect_uri') || !params.get('code_challenge')
  const error = incomplete
    ? 'El enlace de inicio de sesión está incompleto. Vuelve a abrir la aplicación.'
    : failure

  const [confirmed, setConfirmed] = useState(() => {
    if (params.get('prompt') !== 'select_account') return true

    // De vuelta del login tras "Usar otra cuenta": la cuenta ya se eligió.
    if (sessionStorage.getItem(CUENTA_ELEGIDA) === params.get('code_challenge')) {
      sessionStorage.removeItem(CUENTA_ELEGIDA)
      return true
    }

    return false
  })

  const [switching, setSwitching] = useState(false)

  const switchAccount = async () => {
    setSwitching(true)
    sessionStorage.setItem(CUENTA_ELEGIDA, params.get('code_challenge') ?? '')
    // Al quedar sin sesión, la ruta protegida lleva al login y este vuelve aquí al terminar.
    await logout()
  }

  useEffect(() => {
    // En desarrollo StrictMode monta dos veces: sin esto se emitirían dos códigos.
    if (incomplete || !confirmed || requested.current) return
    requested.current = true

    const clientId = params.get('client_id')!
    const redirectUri = params.get('redirect_uri')!
    const codeChallenge = params.get('code_challenge')!
    const state = params.get('state')
    const tenant = params.get('tenant')
    // Código propio de la app (p. ej. Client ID) con el que One busca la empresa.
    const tenantHint = params.get('tenant_hint')

    const authorize = async () => {
      try {
        const { code, tenantId } = await api.post<SsoAuthorizeResponse>('/api/v1/sso/authorize', {
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod: params.get('code_challenge_method') ?? 'S256',
          tenantId: tenant || undefined,
          tenantHint: tenant ? undefined : tenantHint || undefined,
        })

        const destination = new URL(redirectUri)
        destination.searchParams.set('code', code)
        if (state) destination.searchParams.set('state', state)
        const empresa = tenant || tenantId
        if (empresa) destination.searchParams.set('tenant', empresa)

        // replace y no assign: volver atrás desde la app no debe caer otra vez aquí y pedir
        // un código nuevo en bucle.
        window.location.replace(destination.toString())
      } catch (caught) {
        setFailure(
          caught instanceof ApiError
            ? caught.message
            : 'No se pudo contactar con One. Revisa tu conexión e inténtalo de nuevo.',
        )
      }
    }

    void authorize()
  }, [params, incomplete, confirmed])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sunken px-5">
      <div className="surface-card flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
        {error ? (
          <>
            <span className="flex size-11 items-center justify-center rounded-full bg-critical-soft text-critical">
              <ShieldAlert className="size-5" aria-hidden />
            </span>
            <h1 className="text-[1.0625rem] font-semibold text-ink">No se pudo abrir la aplicación</h1>
            <p className="text-[0.8438rem] leading-relaxed text-ink-muted" role="alert">
              {error}
            </p>
            <Link to="/" className="mt-2 text-[0.8438rem] font-medium text-accent hover:underline">
              Volver a mis aplicaciones
            </Link>
          </>
        ) : !confirmed ? (
          <>
            <h1 className="text-[1.0625rem] font-semibold text-ink">¿Con qué cuenta quieres entrar?</h1>
            <p className="text-[0.8438rem] leading-relaxed text-ink-muted">
              Tienes una sesión abierta en One. Sigue con ella o entra con otra cuenta.
            </p>

            <div className="mt-2 flex w-full items-center gap-3 rounded-xl border border-line bg-inset/60 p-3 text-left">
              <Avatar name={user?.fullName} src={user?.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate text-[0.875rem] font-medium text-ink">{user?.fullName}</p>
                <p className="truncate text-[0.75rem] text-ink-muted">{user?.email}</p>
              </div>
            </div>

            <Button variant="primary" className="w-full" onClick={() => setConfirmed(true)} disabled={switching}>
              Continuar como {user?.firstName ?? user?.fullName}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              icon={<LogOut className="size-4" />}
              loading={switching}
              onClick={() => void switchAccount()}
            >
              Usar otra cuenta
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
            <p className="text-[0.875rem] text-ink-soft">Abriendo la aplicación…</p>
          </>
        )}
      </div>
    </div>
  )
}
