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
  /** Correo de soporte que se ofrece en el login. Por defecto, soporte@intechsyscol.com. */
  readonly VITE_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
