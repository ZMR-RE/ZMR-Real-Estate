import { usePropertyPhoto } from './usePropertyPhoto'

interface PropertyPhotoProps {
  propertyId: string
  address: string | null
  cityStateZip: string
}

// Neutral placeholder graphic for the empty state — a plain generic
// image glyph, not a photo of anything specific, since no real photo
// exists yet to represent.
function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="M21 16l-5.5-5.5a1 1 0 0 0-1.4 0L5 19" />
    </svg>
  )
}

// Roadmap 7.34 — full-width hero banner replacing the small square
// thumbnail: the photo spans the box's full width, address/city-state-
// zip overlaid directly on it (white text, dark gradient underneath for
// legibility) rather than sitting in a separate text block beside a
// thumbnail. No upload control here — per the Box interaction standard,
// changing anything only happens via the box's own Edit action
// (PropertyForm still renders PropertyPhotoUploadField's own smaller
// inline preview, unchanged, via the .property-photo class).
export function PropertyPhoto({ propertyId, address, cityStateZip }: PropertyPhotoProps) {
  const { photoUrl, loading } = usePropertyPhoto(propertyId)

  // Blank (no placeholder text yet) while the signed URL is still being
  // fetched, so a property that DOES have a photo never flashes "Add
  // photo" first — only a genuinely absent photo shows that prompt.
  return (
    <div className="property-hero">
      {loading ? null : photoUrl ? (
        <img src={photoUrl} alt="" className="property-hero-image" />
      ) : (
        <div className="property-hero-empty" aria-hidden="true">
          <PlaceholderIcon />
          <span>Add photo</span>
        </div>
      )}
      <div className="property-hero-overlay">
        <h3 className="property-hero-address">{address ?? 'No address on file'}</h3>
        {cityStateZip && <p className="property-hero-subline">{cityStateZip}</p>}
      </div>
    </div>
  )
}
