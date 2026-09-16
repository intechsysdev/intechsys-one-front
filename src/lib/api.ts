import type { AuthResponse } from './types'

const ACCESS_TOKEN_KEY = 'one.access'
const REFRESH_TOKEN_KEY = 'one.refresh'

/**
 * Host del API. En desarrollo se deja vacío para que las rutas sigan siendo
 * relativas y las resuelva el proxy de Vite; en los builds desplegados se
 * inyecta VITE_API_BASE_URL con el App Service correspondiente.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')

/** Error de la API ya traducido a algo que la interfaz puede mostrar. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors?: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }
}

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  save(auth: Pick<AuthResponse, 'accessToken' | 'refreshToken'>) {
    localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken)
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

type SessionExpiredHandler = () => void

let onSessionExpired: SessionExpiredHandler = () => {}

export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler
}

/**
 * Refresco en curso, compartido por todas las peticiones que fallan a la vez:
 * sin esto, N llamadas simultáneas dispararían N rotaciones y la última invalidaría
 * a las anteriores.
 */
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.refresh
  if (!refreshToken) return null

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(buildUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) return null

      const auth = (await response.json()) as AuthResponse
      tokenStore.save(auth)
      return auth.accessToken
    } catch {
      return null
    } finally {
      // Se libera en el siguiente tick para que los que esperan lean el resultado.
      queueMicrotask(() => {
        refreshInFlight = null
      })
    }
  })()

  return refreshInFlight
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  /** Las rutas públicas (login, refresh) no deben disparar el flujo de renovación. */
  anonymous?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(
    path.startsWith('/api') ? path : `/api/v1${path}`,
    API_BASE_URL || window.location.origin,
  )

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }

  // Con API_BASE_URL la petición debe salir absoluta (dominio distinto al del portal);
  // sin él se mantiene relativa para no romper el proxy de desarrollo.
  return API_BASE_URL ? url.toString() : url.pathname + url.search
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Error ${response.status}`
  let fieldErrors: Record<string, string[]> | undefined

  try {
    const payload = await response.json()

    if (payload && typeof payload === 'object') {
      const problem = payload as {
        detail?: string
        title?: string
        errors?: Record<string, string[]>
      }

      message = problem.detail || problem.title || message
      fieldErrors = problem.errors
    }
  } catch {
    // Respuesta sin cuerpo JSON: se conserva el mensaje genérico.
  }

  return new ApiError(response.status, message, fieldErrors)
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, anonymous, headers, ...rest } = options

  const send = async (token: string | null) => {
    const finalHeaders = new Headers(headers)
    if (body !== undefined) finalHeaders.set('Content-Type', 'application/json')
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)

    return fetch(buildUrl(path, query), {
      ...rest,
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  let response = await send(anonymous ? null : tokenStore.access)

  if (response.status === 401 && !anonymous) {
    const renewed = await refreshAccessToken()

    if (renewed) {
      response = await send(renewed)
    } else {
      tokenStore.clear()
      onSessionExpired()
      throw new ApiError(401, 'La sesión expiró. Vuelva a iniciar sesión.')
    }
  }

  if (!response.ok) throw await parseError(response)

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  return (contentType.includes('json') ? await response.json() : await response.text()) as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
