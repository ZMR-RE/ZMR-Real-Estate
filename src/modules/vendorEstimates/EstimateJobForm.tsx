import { useState } from 'react'

interface EstimateJobFormProps {
  unitOptions: { id: string; label: string }[]
  actionItemOptions: { id: string; label: string }[]
  saving: boolean
  onSave: (input: { unitId: string | null; title: string; actionItemId: string | null }) => void
  onCancel: () => void
}

// Roadmap 8.11(b) — start a new estimate comparison. unit and the
// action-item cross-link are both optional: a job is always
// property-specific (required, handled by the caller) but not every
// job is unit- or task-specific.
export function EstimateJobForm({ unitOptions, actionItemOptions, saving, onSave, onCancel }: EstimateJobFormProps) {
  const [title, setTitle] = useState('')
  const [unitId, setUnitId] = useState('')
  const [actionItemId, setActionItemId] = useState('')

  return (
    <div className="inline-form">
      <label htmlFor="estimate_job_title">
        Job<span className="required-marker">*</span>
      </label>
      <input
        id="estimate_job_title"
        required
        placeholder="e.g. Roof replacement"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {unitOptions.length > 0 && (
        <>
          <label htmlFor="estimate_job_unit">Unit</label>
          <select id="estimate_job_unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Whole property</option>
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </>
      )}

      {actionItemOptions.length > 0 && (
        <>
          <label htmlFor="estimate_job_action_item">Linked task</label>
          <select id="estimate_job_action_item" value={actionItemId} onChange={(e) => setActionItemId(e.target.value)}>
            <option value="">No linked task</option>
            {actionItemOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </>
      )}

      <button
        type="button"
        disabled={saving || !title.trim()}
        onClick={() =>
          onSave({ unitId: unitId || null, title: title.trim(), actionItemId: actionItemId || null })
        }
      >
        {saving ? 'Saving…' : 'Add job'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
