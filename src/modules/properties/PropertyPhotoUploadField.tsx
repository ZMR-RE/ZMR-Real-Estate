import { useState } from 'react'
import { usePropertyPhoto } from './usePropertyPhoto'

interface PropertyPhotoUploadFieldProps {
  propertyId: string
}

// Roadmap 7.32 (6) — Edit mode's half, rendered inside PropertyForm.
// Uploads immediately on file choice (the photo isn't a plain properties
// column PropertyForm's own Save batches — it's a documents-table row,
// same "attach now" pattern as InsurancePolicyForm/TaxInstallmentForm's
// document fields) rather than waiting for the form's Save button.
export function PropertyPhotoUploadField({ propertyId }: PropertyPhotoUploadFieldProps) {
  const { photoUrl, loading, uploading, error, upload } = usePropertyPhoto(propertyId)
  const [resetKey, setResetKey] = useState(0)

  const handleChange = async (file: File | null) => {
    if (!file) return
    await upload(file)
    setResetKey((k) => k + 1)
  }

  return (
    <div className="field">
      <label htmlFor="property_photo">Property photo</label>
      {error && <p role="alert">{error}</p>}
      {!loading && photoUrl && (
        <div className="property-photo property-photo-preview">
          <img src={photoUrl} alt="Current property" />
        </div>
      )}
      <input
        key={resetKey}
        id="property_photo"
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
      />
      {uploading && <p>Uploading…</p>}
    </div>
  )
}
