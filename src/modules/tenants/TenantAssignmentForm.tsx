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
    if (!tenantId) return
    onSave({ tenantId, startDate, endDate: endDate || null })
  }

  return (
    <div className="inline-form">
      <label htmlFor="assignment_tenant">Tenant</label>
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

      <label htmlFor="assignment_start">Start date</label>
      <input
        id="assignment_start"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />

      <label htmlFor="assignment_end">End date (leave blank if current)</label>
      <input id="assignment_end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

      <button type="button" disabled={saving || !tenantId} onClick={handleSave}>
        {saving ? 'Saving…' : 'Assign tenant'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
