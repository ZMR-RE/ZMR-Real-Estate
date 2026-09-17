import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './shared/auth/AuthContext.tsx'
import { applyTheme, getStoredTheme } from './shared/theme.ts'

// Applied before the first render so a stored light/dark override (1.12)
// takes effect immediately — no flash of the wrong theme.
applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
