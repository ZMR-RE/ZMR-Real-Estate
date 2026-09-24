import { propertyLabel } from '../../shared/propertyLabel'
import type { Property } from './propertiesQueries'

interface PropertySaveConflictNoticeProps {
  latest: Property
  onKeepEditing: () => void
  onDiscardAndReload: () => void
}

// Batch I5 — shown inside a Property information edit state when a save
// was refused because another editor saved first. The database refused
// the write (20260925080000_properties_set_updated_at.sql); nothing on the
// server was overwritten, and the user's draft is still in the form
// beneath this notice. There is deliberately no "overwrite anyway"
// action: whether a last-writer-wins override should exist at all is a
// product decision, not assumed here — the only way past a conflict is
// to reload the latest version and re-enter any edits deliberately.
export function PropertySaveConflictNotice({ latest, onKeepEditing, onDiscardAndReload }: PropertySaveConflictNoticeProps) {
  return (
    <div role="alert">
      <p>
        <strong>Your changes were not saved.</strong> {propertyLabel(latest)} was changed by someone else after you started
        editing. Your draft is still here — nothing you typed has been lost, and nothing on the server was overwritten.
      </p>
      <p>
        To see what changed, discard your draft and load the latest version (you can re-enter your edits afterward). To keep
        your draft as it is, keep editing — saving again will show this notice until you reload.
      </p>
      <button type="button" onClick={onDiscardAndReload}>
        Discard my changes and load the latest version
      </button>
      <button type="button" onClick={onKeepEditing}>
        Keep editing my draft
      </button>
    </div>
  )
}
