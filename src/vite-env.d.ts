/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Host del API (sin barra final). Vacío o ausente → rutas relativas,
   * que en desarrollo resuelve el proxy de vite.config.ts.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
