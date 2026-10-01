import { useState } from 'react'

interface PreviewDestinationLinkProps {
  label: string
  href: string
  destination: string
}

// An actionable link to where missing information is entered in the real
// dashboard. In this non-saving preview the records are fictional, so the
// click explains the destination instead of navigating to a record that
// doesn't exist. In the built feature this becomes a normal router link.
export function PreviewDestinationLink({ label, href, destination }: PreviewDestinationLinkProps) {
  const [shown, setShown] = useState(false)
  return (
    <span className="agents-destination">
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault()
          setShown(true)
        }}
      >
        {label} →
      </a>
      {shown && (
        <span className="agents-row-meta" role="status">
          Opens {destination}. (Preview records are fictional, so it doesn’t navigate here.)
        </span>
      )}
    </span>
  )
}
