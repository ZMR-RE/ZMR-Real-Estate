import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { HarnessApp } from './HarnessApp'

createRoot(document.getElementById('harness-root')!).render(
  <StrictMode>
    <HarnessApp />
  </StrictMode>,
)
