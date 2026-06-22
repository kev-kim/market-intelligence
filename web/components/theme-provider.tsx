"use client"

import * as React from "react"

/**
 * Minimal theme provider — toggles the `dark` class on <html>. Intentionally
 * does NOT persist to localStorage (DEMO constraint: no browser storage). Theme
 * lives in React state only and resets to dark on reload.
 */
type Theme = "dark" | "light"

const ThemeContext = React.createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}>({ theme: "dark", setTheme: () => {}, toggle: () => {} })

export function useTheme() {
  return React.useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("dark")

  const apply = React.useCallback((t: Theme) => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(t)
    root.style.colorScheme = t
  }, [])

  React.useEffect(() => {
    apply(theme)
  }, [theme, apply])

  const value = React.useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme]
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
