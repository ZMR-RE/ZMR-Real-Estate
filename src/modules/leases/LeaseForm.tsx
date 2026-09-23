import { useState } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { TenantForm } from '../tenants/TenantForm'
import type { TenantOption } from '../tenants/useTenants'
import type { TenantInput } from '../tenants/tenantsQueries'
import type { LeaseInput } from './leasesQueries'

interface LeaseFormProps {
  tenantOptions: TenantOption[]
  onCreateTenant: (input: TenantInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  todayDateString: string
  onSave: (input: LeaseInput) => void
  onCancel: () => void
}

// Roadmap item 4 — a lease has one-or-more tenants (the actual fix for
// the per-tenant-row rent double-counting gap this whole rebuild
// exists for). No shared multi-select component exists in this app, so
// this is a repeatable array of the same single-select SearchableSelect
// TenantAssignmentForm used, one row per co-tenant slot, rather than
// building a new shared multi-select just for this one form.
export function LeaseForm({ tenantOptions, onCreateTenant, saving, todayDateString, onSave, onCancel }: LeaseFormProps) {
  const [tenantIds, setTenantIds] = useState<(string | null)[]>([null])
  // Which slot (if any) is currently showing the inline "add new tenant"
  // form — at most one at a time, same single-flag approach
  // TenantAssignmentForm used, just tracking which slot it's for.
  const [addingTenantForSlot, setAddingTenantForSlot] = useState<number | null>(null)
  const [creatingTenant, setCreatingTenant] = useState(false)
  const [createTenantError, setCreateTenantError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(todayDateString)
  const [endDate, setEndDate] = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [lateFee, setLateFee] = useState('')
  const [moveInFee, setMoveInFee] = useState('')

  const selectedTenantIds = tenantIds.filter((id): id is string => id !== null)

  const handleCreateTenant = async (input: TenantInput) => {
    if (addingTenantForSlot === null) return
    setCreatingTenant(true)
    const result = await onCreateTenant(input)
    setCreatingTenant(false)

    if ('error' in result) {
      setCreateTenantError(result.error)
      return
    }

    setCreateTenantError(null)
    const slot = addingTenantForSlot
    setTenantIds((prev) => prev.map((id, i) => (i === slot ? result.id : id)))
    setAddingTenantForSlot(null)
  }

  const handleSave = () => {
    if (selectedTenantIds.length === 0 || !startDate) return
    onSave({
      tenantIds: selectedTenantIds,
      startDate,
      endDate: endDate || null,
      rentAmount: rentAmount || null,
      lateFee: lateFee || null,
      moveInFee: moveInFee || null,
    })
  }

  return (
    <div className="inline-form">
      <label>
        Tenant(s)<span className="required-marker">*</span>
      </label>
      {tenantIds.map((tenantId, i) =>
        addingTenantForSlot === i ? (
          <TenantForm
            key={i}
            saving={creatingTenant}
            error={createTenantError}
            onSave={handleCreateTenant}
            onCancel={() => {
              setAddingTenantForSlot(null)
              setCreateTenantError(null)
            }}
          />
        ) : (
          <div className="lease-form-tenant-row" key={i}>
            <SearchableSelect
              options={tenantOptions}
              value={tenantId}
              onChange={(id) => setTenantIds((prev) => prev.map((existing, idx) => (idx === i ? id : existing)))}
              placeholder="Select a tenant…"
              onAddNew={() => setAddingTenantForSlot(i)}
              addNewLabel="+ Add new tenant"
            />
            {tenantIds.length > 1 && (
              <button type="button" onClick={() => setTenantIds((prev) => prev.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            )}
          </div>
        ),
      )}
      {addingTenantForSlot === null && (
        <button type="button" onClick={() => setTenantIds((prev) => [...prev, null])}>
          + Add another tenant
        </button>
      )}

      {selectedTenantIds.length > 0 && addingTenantForSlot === null && (
        <>
          <label htmlFor="lease_start">
            Start date<span className="required-marker">*</span>
          </label>
          <input id="lease_start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />

          <label htmlFor="lease_end">End date (leave blank if current)</label>
          <input id="lease_end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

          <label htmlFor="lease_rent">Rent amount ($)</label>
          <input
            id="lease_rent"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
          />

          <label htmlFor="lease_late_fee">Late fee ($)</label>
          <input
            id="lease_late_fee"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={lateFee}
            onChange={(e) => setLateFee(e.target.value)}
          />

          <label htmlFor="lease_move_in_fee">Move-in fee ($)</label>
          <input
            id="lease_move_in_fee"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={moveInFee}
            onChange={(e) => setMoveInFee(e.target.value)}
          />

          <button type="button" disabled={saving || !startDate} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save lease'}
          </button>
        </>
      )}
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
