import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../../index.css'
import './entityBrandingPreview.css'
import { AppShell } from '../../../shared/AppShell'
import { EntityBrandingPreview } from './EntityBrandingPreview'

// NON-SAVING PROPOSAL PREVIEW entry (entity-branding-preview.html only):
// the real AppShell with mocked auth/Supabase (no backend is used at all).
createRoot(document.getElementById('entity-branding-preview-root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/entities/preview']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/entities/preview" element={<EntityBrandingPreview />} />
        </Route>
      </Routes>
    </MemoryRouter>
  </StrictMode>,
)
