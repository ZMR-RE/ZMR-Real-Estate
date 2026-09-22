import { usePropertyPhoto } from './usePropertyPhoto'

interface PropertyPhotoProps {
  propertyId: string
}

// Roadmap 7.32 (6) — View mode's read-only half, rendered inside
// PropertyIdentityHeader next to the address. No upload control here —
// per the Box interaction standard, changing anything only happens via
// the box's own Edit action (PropertyForm renders the upload control).
export function PropertyPhoto({ propertyId }: PropertyPhotoProps) {
  const { photoUrl, loading } = usePropertyPhoto(propertyId)

  if (loading) {
    return <div className="property-photo property-photo-empty" aria-hidden="true" />
  }

  if (!photoUrl) {
    return (
      <div className="property-photo property-photo-empty">
        <span>No photo</span>
      </div>
    )
  }

  return (
    <div className="property-photo">
      <img src={photoUrl} alt="Property" />
    </div>
  )
}
