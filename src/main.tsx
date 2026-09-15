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
