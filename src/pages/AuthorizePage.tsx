import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { SsoAuthorizeResponse } from '@/lib/types'

/**
 * Punto de autorización del SSO. Una app manda aquí al usuario con los parámetros de OAuth 2.0
 * (client_id, redirect_uri, code_challenge, state). Si ya hay sesión se pide el código y se
 * devuelve al usuario a la app al instante; si no, la ruta está protegida y el login trae de
 * vuelta aquí al terminar.
 *
 * La redirección solo ocurre después de que el API aceptó la dirección de retorno: esta página
 * nunca manda al usuario a una URL que la app no haya registrado en el catálogo.
 */
export function AuthorizePage() {
  const [params] = useSearchParams()
  const [failure, setFailure] = useState<string>()
  const requested = useRef(false)

  const incomplete = !params.get('client_id') || !params.get('redirect_uri') || !params.get('code_challenge')
  const error = incomplete
    ? 'El enlace de inicio de sesión está incompleto. Vuelve a abrir la aplicación.'
    : failure

  useEffect(() => {
    // En desarrollo StrictMode monta dos veces: sin esto se emitirían dos códigos.
    if (incomplete || requested.current) return
    requested.current = true

    const clientId = params.get('client_id')!
    const redirectUri = params.get('redirect_uri')!
    const codeChallenge = params.get('code_challenge')!
    const state = params.get('state')
    const tenant = params.get('tenant')

    const authorize = async () => {
      try {
        const { code } = await api.post<SsoAuthorizeResponse>('/api/v1/sso/authorize', {
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod: params.get('code_challenge_method') ?? 'S256',
          tenantId: tenant || undefined,
        })

        const destination = new URL(redirectUri)
        destination.searchParams.set('code', code)
        if (state) destination.searchParams.set('state', state)
        if (tenant) destination.searchParams.set('tenant', tenant)

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
  }, [params, incomplete])

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
