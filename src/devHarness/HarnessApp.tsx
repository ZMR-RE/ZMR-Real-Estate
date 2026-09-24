import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EditableSection } from '../shared/EditableSection'
import { PropertyOwnershipInterestsSection } from '../modules/properties/PropertyOwnershipInterestsSection'
import { PropertyForm } from '../modules/properties/PropertyForm'
import { PropertySaveConflictNotice } from '../modules/properties/PropertySaveConflictNotice'
import { usePropertyProfile } from '../modules/properties/usePropertyProfile'
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
  const [view, setView] = useState<'ownership' | 'entity' | 'property-info'>('ownership')

  const llcOptions = harnessDb.llcs.filter((l) => !l.archived).map((l) => ({ id: l.id as string, label: l.name as string }))

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
          </button>{' '}
          <button type="button" onClick={() => setView('property-info')} aria-pressed={view === 'property-info'}>
            Property information (stale-edit guard)
          </button>
        </div>
        {view === 'ownership' && <PropertyOwnershipInterestsSection propertyId="harness-property-1" llcOptions={llcOptions} />}
        {view === 'entity' && (
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
        {view === 'property-info' && <HarnessPropertyInformation />}
      </div>
    </>
  )
}

// Batch I5 — exercises the real Property information save path
// (usePropertyProfile.saveProperty -> propertiesQueries.updateProperty ->
// the mock's .update().eq('id').eq('updated_at')) and the real conflict
// notice, without dragging in every other Overview section. "Simulate
// another editor saving" writes straight to the in-memory row the way a
// second browser session would hit the database: it bumps updated_at
// (as the real trigger does) and changes a field, so this form's next
// Save is refused and the draft below must survive.
function HarnessPropertyInformation() {
  const {
    property,
    llcOptions,
    createLlc,
    holdingCompanyOptions,
    createHoldingCompany,
    loading,
    error,
    saving,
    saveProperty,
    conflict,
    formResetKey,
    keepEditingAfterConflict,
    discardDraftAndLoadLatest,
  } = usePropertyProfile('harness-property-1')
  const [simulated, setSimulated] = useState(0)

  if (loading && !property) return <p>Loading…</p>
  if (!property) return <p role="alert">{error ?? 'Fixture property not found.'}</p>

  const simulateOtherEditor = () => {
    const row = harnessDb.properties.find((p) => p.id === 'harness-property-1')
    if (!row) return
    row.address = `${simulated + 1} Changed-By-Someone-Else Ave`
    row.updated_at = new Date().toISOString()
    setSimulated((n) => n + 1)
  }

  return (
    <>
      <p>
        <button type="button" onClick={simulateOtherEditor}>
          Simulate another editor saving this property ({simulated} so far)
        </button>
      </p>
      {error && <p role="alert">{error}</p>}
      <EditableSection
        title="Property information"
        defaultOpen
        view={
          <dl className="field-grid">
            <div className="field">
              <dt>Address</dt>
              <dd>{property.address}</dd>
            </div>
            <div className="field">
              <dt>Name</dt>
              <dd>{property.name}</dd>
            </div>
            <div className="field">
              <dt>updated_at (stale-edit token)</dt>
              <dd>{property.updated_at}</dd>
            </div>
          </dl>
        }
        edit={(exitEditing) => (
          <>
            {conflict && (
              <PropertySaveConflictNotice
                latest={conflict}
                onKeepEditing={keepEditingAfterConflict}
                onDiscardAndReload={discardDraftAndLoadLatest}
              />
            )}
            <PropertyForm
              key={`${property.id}-${formResetKey}`}
              propertyId={property.id}
              initialValues={property}
              llcOptions={llcOptions}
              onCreateLlc={createLlc}
              holdingCompanyOptions={holdingCompanyOptions}
              onCreateHoldingCompany={createHoldingCompany}
              saving={saving}
              onSave={async (input) => {
                const ok = await saveProperty(input)
                if (ok) exitEditing()
              }}
              onCancel={exitEditing}
            />
          </>
        )}
      />
    </>
  )
}
