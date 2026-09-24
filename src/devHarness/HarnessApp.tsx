import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PropertyOwnershipInterestsSection } from '../modules/properties/PropertyOwnershipInterestsSection'
import { EntityProfile } from '../modules/llcs/EntityProfile'
import { harnessDb } from './mockSupabaseClient'

// ISOLATED HARNESS PAGE — mounted only by harness.html / npm run
// dev:harness, on its own port. shared/supabaseClient and
// shared/auth/AuthContext are both replaced for this entire bundle (see
// vite.harness.config.ts's resolve.alias) — no AppShell, no router
// beyond a local MemoryRouter, no AuthProvider gate, no real network
// call of any kind. All data is the fictional ZMR-TEST-FIXTURE set in
// fixtures.ts, held in memory and reset on reload.
export function HarnessApp() {
  const [view, setView] = useState<'ownership' | 'entity'>('ownership')

  return (
    <>
      <div style={{ background: '#123456', color: '#fff', padding: '10px 20px', fontSize: 13 }}>
        <strong>MOCK DATA HARNESS</strong> — not connected to Supabase. Fictional ZMR-TEST-FIXTURE data only, reset on
        reload. Not owner-acceptance or Supabase-integration evidence.
      </div>
      <div style={{ padding: 20 }}>
        <div className="mode-toggle" style={{ marginBottom: 16 }}>
          <button type="button" onClick={() => setView('ownership')} aria-pressed={view === 'ownership'}>
            Property Ownership section
          </button>{' '}
          <button type="button" onClick={() => setView('entity')} aria-pressed={view === 'entity'}>
            Entity profile
          </button>
        </div>
        {view === 'ownership' ? (
          <PropertyOwnershipInterestsSection
            propertyId="harness-property-1"
            llcOptions={harnessDb.llcs.filter((l) => !l.archived).map((l) => ({ id: l.id as string, label: l.name as string }))}
          />
        ) : (
          // EntityProfile reads its id via react-router's useParams and
          // renders <Link>s (Breadcrumb, linked properties) — a real
          // MemoryRouter gives correct behavior for both without stubbing
          // react-router itself.
          <MemoryRouter initialEntries={['/entities/harness-llc-entity']}>
            <Routes>
              <Route path="/entities/:id" element={<EntityProfile />} />
            </Routes>
          </MemoryRouter>
        )}
      </div>
    </>
  )
}
