export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'zmr-theme'

// Roadmap 1.12 — an explicit override on top of the existing
// prefers-color-scheme-only theming (see index.css's dark-mode block),
// so the user can preview both modes without changing their OS setting.
// 'system' is the default and removes the override entirely, falling
// straight back to the existing @media query.
export function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to system
  }
  return 'system'
}

export function applyTheme(theme: ThemePreference): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export function setStoredTheme(theme: ThemePreference): void {
  try {
    if (theme === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, theme)
    }
  } catch {
    // localStorage unavailable — the in-memory apply still works for this
    // page load, it just won't persist across reloads
  }
  applyTheme(theme)
}
