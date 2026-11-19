/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Host del API (sin barra final). Vacío o ausente → rutas relativas,
   * que en desarrollo resuelve el proxy de vite.config.ts.
   */
  readonly VITE_API_BASE_URL?: string
  /** Dirección única del portal; quien llega por un alias se lleva aquí. */
  readonly VITE_PORTAL_URL?: string
  /** Hosts que redirigen a VITE_PORTAL_URL, separados por coma. */
  readonly VITE_PORTAL_ALIAS?: string
  /** Correo de soporte que se ofrece en el login. Por defecto, support@intechsyscol.com. */
  readonly VITE_SUPPORT_EMAIL?: string
  /** Portal de casos de soporte. Por defecto, el help center de Intechsys. */
  readonly VITE_SUPPORT_URL?: string
  /** Política de privacidad. Por defecto, la de intechsyscol.com. */
  readonly VITE_PRIVACY_URL?: string
}

/** Versión del package.json, que inyecta vite.config.ts. */
declare const __APP_VERSION__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
