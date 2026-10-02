import { useState } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { TenantForm } from '../tenants/TenantForm'
import type { TenantOption } from '../tenants/useTenants'
import type { TenantInput } from '../tenants/tenantsQueries'
import type { LeaseInput } from './leasesQueries'
import { slotOptions, tenantsNamed, uniqueTenantIds, withSameNameDetails } from './leaseFormLogic'

interface LeaseFormProps {
  tenantOptions: TenantOption[]
  onCreateTenant: (input: TenantInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  todayDateString: string
  onSave: (input: LeaseInput) => void
  onCancel: () => void
  // Resuming an unfinished tenancy: start from its saved dates, rent and fees.
  initial?: Partial<Pick<LeaseInput, 'startDate' | 'endDate' | 'rentAmount' | 'lateFee' | 'moveInFee'>>
  // Adding co-tenants to an existing tenancy: people only — its rent, dates
  // and fees stay as they are, so no dates or rent fields are shown.
  tenantsOnly?: boolean
}

// Roadmap item 4 — a lease has one-or-more tenants (the actual fix for
// the per-tenant-row rent double-counting gap this whole rebuild
// exists for). No shared multi-select component exists in this app, so
// this is a repeatable array of the same single-select SearchableSelect
// TenantAssignmentForm used, one row per co-tenant slot, rather than
// building a new shared multi-select just for this one form.
export function LeaseForm({ tenantOptions, onCreateTenant, saving, todayDateString, onSave, onCancel, initial, tenantsOnly = false }: LeaseFormProps) {
  const [tenantIds, setTenantIds] = useState<(string | null)[]>([null])
  // Which slot (if any) is currently showing the inline "add new tenant"
  // form — at most one at a time, same single-flag approach
  // TenantAssignmentForm used, just tracking which slot it's for.
  const [addingTenantForSlot, setAddingTenantForSlot] = useState<number | null>(null)
  const [creatingTenant, setCreatingTenant] = useState(false)
  const [createTenantError, setCreateTenantError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayDateString)
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [rentAmount, setRentAmount] = useState(initial?.rentAmount ?? '')
  const [lateFee, setLateFee] = useState(initial?.lateFee ?? '')
  const [moveInFee, setMoveInFee] = useState(initial?.moveInFee ?? '')
  // Same-name people show their details in the picker, so the right one is chosen.
  const pickerOptions = withSameNameDetails(tenantOptions)

  const selectedTenantIds = uniqueTenantIds(tenantIds)
  // A "new" tenant whose name matches someone already saved (for example a
  // person created before a lease failed or was cancelled): offer that person
  // first, so nobody is created twice. Creating another is still possible.
  const [nameMatch, setNameMatch] = useState<{ input: TenantInput; matches: TenantOption[] } | null>(null)

  const chooseExistingTenant = (id: string) => {
    const slot = addingTenantForSlot
    if (slot === null) return
    setTenantIds((prev) => prev.map((existing, i) => (i === slot ? id : existing)))
    setNameMatch(null)
    setAddingTenantForSlot(null)
  }

  const handleCreateTenant = async (input: TenantInput, confirmedNew = false) => {
    if (addingTenantForSlot === null) return
    const matches = tenantsNamed(tenantOptions, input.name)
    if (!confirmedNew && matches.length > 0) {
      setNameMatch({ input, matches })
      return
    }
    setNameMatch(null)
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
    if (selectedTenantIds.length === 0 || (!tenantsOnly && !startDate)) return
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
              setNameMatch(null)
            }}
          />
        ) : (
          <div className="lease-form-tenant-row" key={i}>
            <SearchableSelect
              options={slotOptions(pickerOptions, tenantIds, i)}
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
      {nameMatch && (
        <div role="status">
          <p>
            <strong>A tenant named “{nameMatch.input.name.trim()}” already exists.</strong> If it’s the same person, use the existing record so their history stays in one place. If it’s someone else with the same name, create a different person.
          </p>
          <p className="field-hint">
            You entered: {[nameMatch.input.email, nameMatch.input.phone].filter(Boolean).join(' · ') || 'no email or phone'}
          </p>
          <div className="lease-form-tenant-row">
            {nameMatch.matches.map((m) => (
              <button key={m.id} type="button" onClick={() => chooseExistingTenant(m.id)}>
                Use existing: {m.label} — {m.detail}
              </button>
            ))}
            <button type="button" disabled={creatingTenant} onClick={() => handleCreateTenant(nameMatch.input, true)}>
              Create a different person with this name
            </button>
          </div>
        </div>
      )}
      {addingTenantForSlot === null && (
        <button type="button" onClick={() => setTenantIds((prev) => [...prev, null])}>
          + Add another tenant
        </button>
      )}

      {tenantsOnly && selectedTenantIds.length > 0 && addingTenantForSlot === null && (
        <button type="button" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}

      {!tenantsOnly && selectedTenantIds.length > 0 && addingTenantForSlot === null && (
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
