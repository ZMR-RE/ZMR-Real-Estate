import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { SearchableSelect, type SearchableSelectOption } from '../../shared/SearchableSelect'
import { VendorForm } from '../vendors/VendorForm'
import type { VendorInput } from '../vendors/vendorsQueries'
import type { EntryType, TransactionPayer } from './financialsQueries'
import { listTenantPayerOptions, type TenantPayerOption } from './transactionPayerQueries'
import { tenantOptionLabel } from './transactionEntry'

interface TransactionPayerFieldProps {
  entryType: EntryType
  propertyId: string
  payer: TransactionPayer
  onChange: (payer: TransactionPayer) => void
  vendorOptions: SearchableSelectOption[]
  onCreateVendor: (input: VendorInput) => Promise<{ id: string } | { error: string }>
  error: string | undefined
  errorId: string
  // Name of the payer already stored on an existing transaction, for
  // display when it isn't among the current options.
  storedTenantName?: string
}

// M4 — "Paid to / received from". Expenses are paid to a vendor (as
// before). Income can come from a tenant — chosen from this property's
// leases, current or past — or from a vendor, without forcing a tenant
// through the vendor form. The stored payer is always one of
// vendor_id/tenant_id/prospective_tenant_id; an existing transaction's
// payer is shown as stored and only changes when the user changes it.
export function TransactionPayerField({
  entryType,
  propertyId,
  payer,
  onChange,
  vendorOptions,
  onCreateVendor,
  error,
  errorId,
  storedTenantName,
}: TransactionPayerFieldProps) {
  const { accountId } = useAuth()
  const [tenantOptions, setTenantOptions] = useState<TenantPayerOption[] | null>(null)
  const [tenantError, setTenantError] = useState<string | null>(null)
  const [clearedNotice, setClearedNotice] = useState<string | null>(null)
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [createVendorError, setCreateVendorError] = useState<string | null>(null)
  const [incomeSource, setIncomeSource] = useState<'tenant' | 'vendor'>(payer.kind === 'vendor' ? 'vendor' : 'tenant')
  // Latest payer/onChange for the async property-change check below.
  const payerRef = useRef(payer)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    payerRef.current = payer
    onChangeRef.current = onChange
  })

  const loadTenants = useCallback(async (): Promise<TenantPayerOption[] | null> => {
    if (!accountId || !propertyId) {
      setTenantOptions([])
      return []
    }
    const { data, error: fetchError } = await listTenantPayerOptions(accountId, propertyId)
    if (fetchError) {
      setTenantError(`Couldn't load tenants: ${fetchError.message}`)
      return null
    }
    setTenantError(null)
    setTenantOptions(data ?? [])
    return data ?? []
  }, [accountId, propertyId])

  // Reload when the property changes. Only a property change made in
  // this form can clear a chosen tenant — and only if they have no lease
  // at the newly chosen property; nobody is substituted. The first load
  // for an existing transaction never clears what was stored.
  const previousProperty = useRef(propertyId)
  useEffect(() => {
    const changed = previousProperty.current !== propertyId
    previousProperty.current = propertyId
    let cancelled = false
    loadTenants().then((options) => {
      if (cancelled || !changed || options === null) return
      const current = payerRef.current
      if (current.kind === 'tenant' && !options.some((o) => o.tenantId === current.id)) {
        onChangeRef.current({ kind: 'none' })
        setClearedNotice('The tenant was cleared because they have no lease at this property. Choose a tenant for this property.')
      }
    })
    return () => {
      cancelled = true
    }
  }, [propertyId, loadTenants])

  const handleCreateVendor = async (input: VendorInput) => {
    setCreatingVendor(true)
    const result = await onCreateVendor(input)
    setCreatingVendor(false)
    if ('error' in result) {
      setCreateVendorError(result.error)
      return
    }
    setCreateVendorError(null)
    setIsAddingVendor(false)
    onChange({ kind: 'vendor', id: result.id })
  }

  const showTenantPicker = entryType === 'income' && incomeSource === 'tenant'

  const tenantSelectOptions: SearchableSelectOption[] = (tenantOptions ?? []).map((o) => ({
    id: `${o.tenantId}::${o.leaseId}`,
    label: tenantOptionLabel(o),
  }))
  const selectedTenantOption =
    payer.kind === 'tenant' ? tenantSelectOptions.find((o) => o.id.startsWith(`${payer.id}::`)) ?? null : null
  if (payer.kind === 'tenant' && !selectedTenantOption && tenantOptions !== null) {
    // Stored tenant no longer on a (non-archived) lease here: keep and show it.
    tenantSelectOptions.unshift({
      id: `${payer.id}::stored`,
      label: `${storedTenantName ?? 'Tenant on this transaction'} (no current lease listed at this property)`,
    })
  }

  return (
    <div className="transaction-payer" aria-describedby={error ? errorId : undefined}>
      <label id="payer_label">
        {entryType === 'income' ? 'Received from' : 'Paid to'}
        <span className="required-marker">*</span>
      </label>

      {payer.kind === 'prospective_tenant' && (
        <p className="field-hint">
          Prospective tenant: {payer.name} (from Quick Capture). Choose a tenant or vendor below to change it.
        </p>
      )}

      {entryType === 'income' && (
        <div role="group" aria-labelledby="payer_label">
          <button
            type="button"
            aria-pressed={incomeSource === 'tenant'}
            onClick={() => {
              setIncomeSource('tenant')
              if (payer.kind === 'vendor') onChange({ kind: 'none' })
            }}
          >
            Tenant
          </button>
          <button
            type="button"
            aria-pressed={incomeSource === 'vendor'}
            onClick={() => {
              setIncomeSource('vendor')
              if (payer.kind === 'tenant') onChange({ kind: 'none' })
            }}
          >
            Vendor or other
          </button>
        </div>
      )}

      {showTenantPicker ? (
        <div id="payer_input" className="transaction-payer-picker">
          {!propertyId ? (
            <p className="field-hint">Choose the property first to see its tenants.</p>
          ) : tenantOptions !== null && tenantSelectOptions.length === 0 ? (
            <p className="field-hint">
              No tenants are on a lease at this property yet. Add the lease on the property's profile, or choose
              “Vendor or other”.
            </p>
          ) : (
            <SearchableSelect
              options={tenantSelectOptions}
              value={selectedTenantOption?.id ?? (payer.kind === 'tenant' ? `${payer.id}::stored` : null)}
              onChange={(optionId) => {
                setClearedNotice(null)
                onChange({ kind: 'tenant', id: optionId.split('::')[0] })
              }}
              onOpen={loadTenants}
              placeholder="Select tenant"
            />
          )}
          {tenantError && <p role="alert">{tenantError}</p>}
        </div>
      ) : isAddingVendor ? (
        <VendorForm
          saving={creatingVendor}
          error={createVendorError}
          onSave={handleCreateVendor}
          onCancel={() => {
            setIsAddingVendor(false)
            setCreateVendorError(null)
          }}
        />
      ) : (
        <div id="payer_input" className="transaction-payer-picker">
          <SearchableSelect
            options={vendorOptions}
            value={payer.kind === 'vendor' ? payer.id : null}
            onChange={(id) => {
              setClearedNotice(null)
              onChange({ kind: 'vendor', id })
            }}
            placeholder="Select vendor"
            onAddNew={() => setIsAddingVendor(true)}
            addNewLabel="+ Add new vendor"
          />
        </div>
      )}

      {clearedNotice && <p className="field-hint" role="status">{clearedNotice}</p>}
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
