import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EditableSection } from '../../shared/EditableSection'
import { SearchableSelect } from '../../shared/SearchableSelect'
import './entityBranding.css'
import { BrandingDocumentsForm } from './BrandingDocumentsForm'
import { BrandingLivePreview } from './BrandingLivePreview'
import { BrandingSummary } from './BrandingSummary'
import type { Stationery } from './stationeryTypes'
import { useEntityBranding, type PendingLogo } from './useEntityBranding'

// Settings › Entities › Branding & documents. Edits the EXISTING entity's
// stationery (one settings row per entity — not a second issuer record).
export function EntityBrandingSettings({ initialEntityId }: { initialEntityId: string | null }) {
  const b = useEntityBranding(initialEntityId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Stationery>(b.stationery)
  const [pendingLogo, setPendingLogo] = useState<PendingLogo | null>(null)

  if (b.entities.length === 0) return <p className="empty-state">No entities yet. Add one under Organizations first.</p>

  const current = editing ? draft : b.stationery
  return (
    <div className="branding-page">
      <label>Entity</label>
      <SearchableSelect
        options={b.entities.map((e) => ({ id: e.id, label: e.display_name || e.name }))}
        value={b.entityId}
        onChange={(id) => {
          setEditing(false)
          b.selectEntity(id)
        }}
      />
      {b.entityId && <p className="field-hint"><Link to={`/entities/${b.entityId}`}>Open entity profile</Link> — name and address are edited under Identity there.</p>}
      {b.error && <p className="branding-warning" role="alert">{b.error}</p>}
      {b.identity && !b.loading && (
        <div className="branding-layout">
          <EditableSection
            key={b.entityId ?? ''}
            title="Branding & documents"
            defaultOpen
            view={<BrandingSummary stationery={b.stationery} />}
            onEditStart={() => {
              setDraft(b.stationery)
              setPendingLogo(null)
              setEditing(true)
            }}
            edit={(exit) => (
              <BrandingDocumentsForm
                draft={draft}
                onChange={setDraft}
                onPendingLogo={setPendingLogo}
                saving={b.saving}
                onCancel={() => {
                  setEditing(false)
                  exit()
                }}
                onSave={async () => {
                  if (await b.save(draft, pendingLogo)) {
                    setEditing(false)
                    exit()
                  }
                }}
              />
            )}
          />
          <BrandingLivePreview identity={b.identity} stationery={current} editing={editing} />
        </div>
      )}
    </div>
  )
}
