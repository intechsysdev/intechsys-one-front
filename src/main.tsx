import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { App } from './App'
import { ApiError } from './lib/api'
import { AuthProvider } from './providers/AuthProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Reintentar un 401/403/404 solo genera ruido: el fallo es determinista.
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})

/**
 * El portal tiene una sola dirección. La sesión de One vive en el almacenamiento del navegador de
 * ese dominio: quien entra por intechsysone.com y luego llega por la dirección de Azure (o con www)
 * está, para el navegador, en otro sitio y sin sesión, y las apps le pedirían entrar otra vez. Quien
 * llega por un alias se lleva al dominio principal con la misma ruta, /autorizar y sus parámetros
 * incluidos.
 */
const principal = (import.meta.env.VITE_PORTAL_URL ?? '').replace(/\/+$/, '')
const alias = (import.meta.env.VITE_PORTAL_ALIAS ?? '')
  .split(',')
  .map((host: string) => host.trim().toLowerCase())
  .filter(Boolean)

if (principal && alias.includes(window.location.hostname.toLowerCase())) {
  window.location.replace(principal + window.location.pathname + window.location.search + window.location.hash)
} else {
  renderizar()
}

function renderizar() {
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster
              position="bottom-right"
              closeButton
              toastOptions={{
                classNames: {
                  toast:
                    'rounded-xl border border-line bg-overlay text-ink shadow-[var(--shadow-float)]',
                  description: 'text-ink-muted',
                  actionButton: 'bg-accent text-accent-contrast',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
}
