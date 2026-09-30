import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../../index.css'
// Profile base rules first: agentsWorkspacePreview.css's responsive
// @media blocks override some of them and must come later in the cascade.
import './agentsPreviewTokens.css'
import './agentsProfilePreview.css'
import './agentsWorkspacePreview.css'
import './agentsPreviewPhone.css'
import { AppShell } from '../../../shared/AppShell'
import { AgentsWorkspacePreview } from './AgentsWorkspacePreview'

// NON-SAVING DESIGN PREVIEW entry (agents-preview.html only). The real
// AppShell frame with mocked auth/Supabase (vite.agents-preview.config.ts
// aliases), so the preview is seen at the real sidebar/content width and
// can never read or write a real database. Not wired into App.tsx.
createRoot(document.getElementById('agents-preview-root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/automations']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/automations" element={<AgentsWorkspacePreview />} />
        </Route>
      </Routes>
    </MemoryRouter>
  </StrictMode>,
)
