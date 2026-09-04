import { useState } from 'react'
import type { LlcInput } from './llcsQueries'

interface LlcFormProps {
  saving: boolean
  error: string | null
  onSave: (input: LlcInput) => void
  onCancel: () => void
}

const BLANK_LLC: LlcInput = {
  name: '',
  ein: null,
  formation_state: null,
  registered_agent: null,
  annual_report_due_date: null,
}

// A plain div, not a <form> — this renders inside PropertyForm's own
// <form>, and HTML forms can't nest without invalid markup and a submit
// that bubbles into the outer form.
export function LlcForm({ saving, error, onSave, onCancel }: LlcFormProps) {
  const [values, setValues] = useState<LlcInput>(BLANK_LLC)

  const field = (key: keyof LlcInput) => ({
    value: values[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value || null })),
  })

  return (
    <div className="inline-form">
      {error && <p role="alert">{error}</p>}

      <label htmlFor="llc_form_name">LLC name</label>
      <input
        id="llc_form_name"
        required
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
      />

      <label htmlFor="llc_form_ein">EIN</label>
      <input id="llc_form_ein" {...field('ein')} />

      <label htmlFor="llc_form_formation_state">Formation state</label>
      <input id="llc_form_formation_state" {...field('formation_state')} />

      <label htmlFor="llc_form_registered_agent">Registered agent</label>
      <input id="llc_form_registered_agent" {...field('registered_agent')} />

      <label htmlFor="llc_form_annual_report_due_date">Annual report due date</label>
      <input id="llc_form_annual_report_due_date" type="date" {...field('annual_report_due_date')} />

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Adding…' : 'Add LLC'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
