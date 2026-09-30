import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../../index.css'
import { AppShell } from '../../../shared/AppShell'
import { Settings } from '../../settings/Settings'

// REVIEW PAGE (entity-branding-review.html): the REAL Settings screen, opened
// on Entities › Branding & documents, inside the real AppShell, against a
// SIMULATED backend (fictional entities; nothing leaves the browser).
createRoot(document.getElementById('entity-branding-review-root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/settings?tab=entities&entity=ent-a']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<p className="empty-state">Only Settings is available on this review page.</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  </StrictMode>,
)
