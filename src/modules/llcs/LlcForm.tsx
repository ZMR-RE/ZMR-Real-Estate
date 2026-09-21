import { useState } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'
import { HoldingCompanyForm } from '../holdingCompanies/HoldingCompanyForm'
import type { HoldingCompanyInput } from '../holdingCompanies/holdingCompaniesQueries'
import { NO_HOLDING_COMPANY_ID } from '../holdingCompanies/useHoldingCompanies'
import type { LlcInput } from './llcsQueries'

interface LlcFormProps {
  initialValues?: LlcInput
  saving: boolean
  error: string | null
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  onSave: (input: LlcInput) => void
  onCancel: () => void
}

const BLANK_LLC: LlcInput = {
  name: '',
  ein: null,
  formation_state: null,
  registered_agent: null,
  formation_date: null,
  annual_report_due_date: null,
  holding_company_id: null,
}

// A plain div, not a <form> — this renders inside PropertyForm's own
// <form>, and HTML forms can't nest without invalid markup and a submit
// that bubbles into the outer form. Also reused standalone (no outer
// form) by Settings' Organization types management view (roadmap 8.2a),
// for both add (no initialValues) and edit (initialValues passed).
export function LlcForm({
  initialValues,
  saving,
  error,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  onSave,
  onCancel,
}: LlcFormProps) {
  const [values, setValues] = useState<LlcInput>(initialValues ?? BLANK_LLC)
  const isEditing = initialValues !== undefined
  const [isAddingHoldingCompany, setIsAddingHoldingCompany] = useState(false)
  const [creatingHoldingCompany, setCreatingHoldingCompany] = useState(false)
  const [createHoldingCompanyError, setCreateHoldingCompanyError] = useState<string | null>(null)

  const handleCreateHoldingCompany = async (input: HoldingCompanyInput) => {
    setCreatingHoldingCompany(true)
    const result = await onCreateHoldingCompany(input)
    setCreatingHoldingCompany(false)

    if ('error' in result) {
      setCreateHoldingCompanyError(result.error)
      return
    }

    setCreateHoldingCompanyError(null)
    setValues((prev) => ({ ...prev, holding_company_id: result.id }))
    setIsAddingHoldingCompany(false)
  }

  const field = (key: keyof LlcInput) => ({
    value: values[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value || null })),
  })

  return (
    <div className="inline-form">
      {error && <p role="alert">{error}</p>}

      <label htmlFor="llc_form_name">
        Organization type name<span className="required-marker">*</span>
      </label>
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

      <label htmlFor="llc_form_formation_date">Formation date</label>
      <input id="llc_form_formation_date" type="date" {...field('formation_date')} />

      <label htmlFor="llc_form_annual_report_due_date">Annual report due date</label>
      <input id="llc_form_annual_report_due_date" type="date" {...field('annual_report_due_date')} />

      <label htmlFor="llc_form_holding_company_id">Holding company</label>
      {isAddingHoldingCompany ? (
        <HoldingCompanyForm
          saving={creatingHoldingCompany}
          error={createHoldingCompanyError}
          onSave={handleCreateHoldingCompany}
          onCancel={() => {
            setIsAddingHoldingCompany(false)
            setCreateHoldingCompanyError(null)
          }}
        />
      ) : (
        <SearchableSelect
          options={holdingCompanyOptions}
          value={values.holding_company_id ?? NO_HOLDING_COMPANY_ID}
          onChange={(id) =>
            setValues((prev) => ({ ...prev, holding_company_id: id === NO_HOLDING_COMPANY_ID ? null : id }))
          }
          placeholder="Select a holding company"
          onAddNew={() => setIsAddingHoldingCompany(true)}
          addNewLabel="+ Add new holding company"
        />
      )}

      <button type="button" disabled={saving || !values.name.trim()} onClick={() => onSave(values)}>
        {saving ? 'Saving…' : isEditing ? 'Save' : 'Add organization type'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
