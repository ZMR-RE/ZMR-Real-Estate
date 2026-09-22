import { useState, type ReactNode } from 'react'

interface EditableSectionProps {
  title: string
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
// Deliberately its own box shell (border/radius/background matching
// CollapsibleSection's, reusing those same classes) rather than nesting
// inside CollapsibleSection — the standard describes a self-contained
// box, and compounding two header chromes (collapse toggle + edit
// toggle) into one title row wasn't asked for here. A box that needs
// both stays a future extension, not guessed at now.
export function EditableSection({ title, secondaryActions, view, edit, onEditStart }: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false)

  const startEditing = () => {
    onEditStart?.()
    setIsEditing(true)
  }

  const exitEditing = () => setIsEditing(false)

  return (
    <section className="collapsible-section editable-section">
      <div className="editable-section-header">
        <h3 className="editable-section-title">{title}</h3>
        <div className="editable-section-actions">
          {secondaryActions}
          {!isEditing && (
            <button type="button" className="editable-section-edit" onClick={startEditing}>
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="collapsible-section-body">{isEditing ? edit(exitEditing) : view}</div>
    </section>
  )
}
