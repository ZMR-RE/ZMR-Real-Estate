interface InfoTooltipProps {
  text: string
}

// Roadmap 7.30 — first instance of a tooltip pattern in the app: a
// small "?" icon next to a label, revealing helper text on hover/focus
// instead of that text always sitting visible on the page. Pure CSS
// (:hover/:focus-within in index.css) — no positioning library, no
// JS-driven show/hide state.
export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="info-tooltip" tabIndex={0}>
      <span className="info-tooltip-icon" aria-hidden="true">
        ?
      </span>
      <span className="info-tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  )
}
