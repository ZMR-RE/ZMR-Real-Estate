import { useState } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { TenantForm } from './TenantForm'
import type { TenantOption } from './useTenants'
import type { TenantInput, TenantUnitAssignmentInput } from './tenantsQueries'

interface TenantAssignmentFormProps {
  tenantOptions: TenantOption[]
  onCreateTenant: (input: TenantInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  todayDateString: string
  onSave: (input: TenantUnitAssignmentInput) => void
  onCancel: () => void
}

export function TenantAssignmentForm({
  tenantOptions,
  onCreateTenant,
  saving,
  todayDateString,
  onSave,
  onCancel,
}: TenantAssignmentFormProps) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [isAddingTenant, setIsAddingTenant] = useState(false)
  const [creatingTenant, setCreatingTenant] = useState(false)
  const [createTenantError, setCreateTenantError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(todayDateString)
  const [endDate, setEndDate] = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [lateFee, setLateFee] = useState('')

  const handleCreateTenant = async (input: TenantInput) => {
    setCreatingTenant(true)
    const result = await onCreateTenant(input)
    setCreatingTenant(false)

    if ('error' in result) {
      setCreateTenantError(result.error)
      return
    }

    setCreateTenantError(null)
    setTenantId(result.id)
    setIsAddingTenant(false)
  }

  const handleSave = () => {
    if (!tenantId || !startDate) return
    onSave({
      tenantId,
      startDate,
      endDate: endDate || null,
      rentAmount: rentAmount || null,
      lateFee: lateFee || null,
    })
  }

  return (
    <div className="inline-form">
      <label htmlFor="assignment_tenant">
        Tenant<span className="required-marker">*</span>
      </label>
      {isAddingTenant ? (
        <TenantForm
          saving={creatingTenant}
          error={createTenantError}
          onSave={handleCreateTenant}
          onCancel={() => {
            setIsAddingTenant(false)
            setCreateTenantError(null)
          }}
        />
      ) : (
        <SearchableSelect
          options={tenantOptions}
          value={tenantId}
          onChange={setTenantId}
          placeholder="Select a tenant…"
          onAddNew={() => setIsAddingTenant(true)}
          addNewLabel="+ Add new tenant"
        />
      )}

      <label htmlFor="assignment_start">
        Start date<span className="required-marker">*</span>
      </label>
      <input
        id="assignment_start"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />

      <label htmlFor="assignment_end">End date (leave blank if current)</label>
      <input id="assignment_end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

      <label htmlFor="assignment_rent">Rent amount ($)</label>
      <input
        id="assignment_rent"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={rentAmount}
        onChange={(e) => setRentAmount(e.target.value)}
      />

      <label htmlFor="assignment_late_fee">Late fee ($)</label>
      <input
        id="assignment_late_fee"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={lateFee}
        onChange={(e) => setLateFee(e.target.value)}
      />

      <button type="button" disabled={saving || !tenantId || !startDate} onClick={handleSave}>
        {saving ? 'Saving…' : 'Assign tenant'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
