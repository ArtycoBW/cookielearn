"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AppTheme = 'ocean' | 'mint' | 'midnight'

type ThemeContextValue = {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

const STORAGE_KEY = 'cookielearn-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('ocean')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const initialTheme: AppTheme =
      stored === 'ocean' || stored === 'mint' || stored === 'midnight' ? (stored as AppTheme) : 'ocean'

    setThemeState(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    }
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
