import { useState } from 'react'
import { usePropertyDeedDocument } from './usePropertyDeedDocument'

interface PropertyDeedUploadFieldProps {
  propertyId: string
}

// Roadmap 7.39 (3) — Edit mode's half, same "attach now" pattern as
// PropertyPhotoUploadField: the deed isn't a plain properties column
// PropertyForm's own Save batches, it's a documents-table row, so
// choosing a file uploads immediately rather than waiting for Save.
export function PropertyDeedUploadField({ propertyId }: PropertyDeedUploadFieldProps) {
  const { document, loading, uploading, error, upload, view } = usePropertyDeedDocument(propertyId)
  const [resetKey, setResetKey] = useState(0)

  const handleChange = async (file: File | null) => {
    if (!file) return
    await upload(file)
    setResetKey((k) => k + 1)
  }

  return (
    <div className="field">
      <label htmlFor="property_deed">Deed document</label>
      {error && <p role="alert">{error}</p>}
      {!loading && document && (
        <p>
          <button type="button" onClick={view}>
            View current deed document
          </button>
        </p>
      )}
      <input
        key={resetKey}
        id="property_deed"
        type="file"
        accept="image/*,application/pdf"
        disabled={uploading}
        onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
      />
      {uploading && <p>Uploading…</p>}
    </div>
  )
}
