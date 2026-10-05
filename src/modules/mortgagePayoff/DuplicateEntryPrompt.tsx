interface DuplicateEntryPromptProps {
  message: string
  busy: boolean
  onConfirm: () => void
  onDismiss: () => void
}

// Duplicate rule (contract rule 5): an identical entry exists. Nothing was saved; the form keeps its values. The user
// either confirms it's a separate payment (the database recounts) or cancels the prompt.
export function DuplicateEntryPrompt({ message, busy, onConfirm, onDismiss }: DuplicateEntryPromptProps) {
  return (
    <div role="alert">
      <p>{message}</p>
      <p className="field-hint">These details stay locked while you confirm. Cancel to edit them.</p>
      <button type="button" onClick={onConfirm} disabled={busy}>
        Record anyway (it's a separate payment)
      </button>{' '}
      <button type="button" onClick={onDismiss} disabled={busy}>
        Cancel
      </button>
    </div>
  )
}
