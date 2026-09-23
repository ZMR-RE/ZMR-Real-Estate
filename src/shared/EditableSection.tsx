import { useState, type ReactNode } from 'react'
import { cardTintClass } from './cardTint'

interface EditableSectionProps {
  title: string
  // Lets another box link/scroll directly to this one (e.g. Tenants'
  // "Manage tenants in Units" link) via a plain #id anchor.
  id?: string
  // Same default-collapsed convention as CollapsibleSection.
  defaultOpen?: boolean
  // Box-level secondary actions (Archive, Show archived, Restore,
  // export) — rendered top-right alongside Edit, per the standard's
  // explicit "never causing the box to grow taller" rule. Always
  // visible regardless of view/edit state, same as Edit itself.
  secondaryActions?: ReactNode
  // View-only content, shown by default and after Save/Cancel.
  view: ReactNode
  // Edit-state content, shown only after Edit is clicked. Receives
  // `exitEditing` so its own Save/Cancel controls can return the box to
  // view-only when done — this component owns none of that: no
  // validation, no saving state, no Supabase call. Those stay owned by
  // whichever module's Form/List component is passed in here, per
  // CLAUDE.md's Code organization rule (business logic lives in that
  // module's own use<Module>.ts, never in a shared structural
  // component). "Adding a new item" also happens inside this same edit
  // content — there is no separate standing "+ Add [X]" element
  // anywhere else on the box.
  edit: (exitEditing: () => void) => ReactNode
  // Re-seed the caller's own edit-form state fresh each time Edit is
  // entered (e.g. from the latest prop data), rather than leaving
  // whatever a previous open-then-cancel cycle left behind. Optional —
  // most callers derive their edit content straight from props, which
  // already stay current without this.
  onEditStart?: () => void
}

// The one shared implementation of CLAUDE.md's Box interaction
// standard: every box defaults to view-only; a single top-right "Edit"
// action is the only way into an editable state; saving or canceling
// from that state returns to view-only. Every box on every screen is
// expected to use this — a bespoke isAdding/editingId toggle with its
// own persistent "+ Add [X]" button below the list, the pattern several
// modules used before this standard existed, is what this replaces.
//
// Standard rollout completeness fix — collapse and edit were built as
// if they were separable (a plain div header, "this box is never
// collapsed"), which quietly dropped every converted box's chevron.
// They're not separable: every box needs both. Reuses
// CollapsibleSection's exact <details>/<summary> mechanics (the
// `collapsible-section`/`collapsible-section-body` classes, so it's the
// same visual family and gets the chevron/open-state CSS for free) plus
// its header-actions stopPropagation technique, applied to both
// secondaryActions and the Edit button — without it, clicking Edit (or
// a secondary action) while the box is collapsed would also toggle the
// native <details> open state, since both live inside <summary>.
// Collapsing mid-edit does not discard edit state: <details> hides its
// body natively without unmounting React children, so isEditing (and
// whatever the caller's own edit form holds) survives a collapse/
// re-expand cycle.
export function EditableSection({
  title,
  id,
  defaultOpen = false,
  secondaryActions,
  view,
  edit,
  onEditStart,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false)

  const startEditing = () => {
    onEditStart?.()
    setIsEditing(true)
  }

  const exitEditing = () => setIsEditing(false)

  // Roadmap 7.39 (5) — same persistent expanded-state tint as
  // CollapsibleSection, see its own comment for the reasoning.
  return (
    <details id={id} className={`collapsible-section editable-section ${cardTintClass(title)}`} open={defaultOpen}>
      <summary>
        <span className="collapsible-section-title">{title}</span>
        <span
          className="collapsible-section-header-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {secondaryActions}
          {!isEditing && (
            <button type="button" className="editable-section-edit" onClick={startEditing}>
              Edit
            </button>
          )}
        </span>
      </summary>
      <div className="collapsible-section-body">{isEditing ? edit(exitEditing) : view}</div>
    </details>
  )
}
