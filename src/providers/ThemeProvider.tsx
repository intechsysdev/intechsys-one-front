import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'one.theme'

function readInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggle = useCallback(() => setThemeState((value) => (value === 'dark' ? 'light' : 'dark')), [])

  return <ThemeContext value={{ theme, toggle, setTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider.')
  return context
}
