import { Link } from 'react-router-dom'

interface BreadcrumbProps {
  to: string
  label: string
}

// Roadmap 7.39 (1) — a proper breadcrumb element (small chevron + text,
// no underline, muted until hover) replacing the plain underlined
// "&larr; Property registry" link text. Only one instance of this
// pattern exists in the app today (Property Profile's own back link),
// but built as a shared component rather than inlined so any future
// detail page (Mortgage, LLC, etc.) reuses the same look instead of
// re-inventing it.
export function Breadcrumb({ to, label }: BreadcrumbProps) {
  return (
    <Link to={to} className="breadcrumb">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  )
}
