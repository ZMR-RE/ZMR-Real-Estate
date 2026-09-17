import { useState } from 'react'
import { getStoredTheme, setStoredTheme, type ThemePreference } from '../../shared/theme'

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Match device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Roadmap 1.12 — an explicit override so the user can preview both
// modes without changing their OS setting. "Match device" (the default)
// removes the override and falls back to prefers-color-scheme.
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(getStoredTheme)

  const choose = (value: ThemePreference) => {
    setStoredTheme(value)
    setTheme(value)
  }

  return (
    <section>
      <h2>Appearance</h2>
      <p>Preview the app in light or dark mode, or follow your device's setting.</p>
      <div className="segmented-control" role="group" aria-label="Appearance">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={theme === option.value}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
