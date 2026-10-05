import { useState, type FormEvent } from 'react'
import { DuplicateEntryPrompt } from './DuplicateEntryPrompt'
import { HistoryChoiceField } from './HistoryChoiceField'
import { effectiveHistoryOnly } from './mortgageHistoryEntry'
import type { EscrowTransactionType, MortgageEscrowTransactionInput } from './mortgagePayoffQueries'

interface EscrowTransactionFormProps {
  onCancel?: () => void
  onSaved?: () => void
  initialValues: MortgageEscrowTransactionInput
  saving: boolean
  error: string | null
  onSave: (input: MortgageEscrowTransactionInput, historyOnly: boolean) => Promise<boolean>
  // Option B: the balance's statement date (null = unknown) decides whether "history only" is offered.
  statementDate: string | null | undefined
  // An identical entry exists (nothing saved; values kept) — "Record anyway" resubmits with the shown count.
  duplicateMessage: string | null
  onConfirmDuplicate: () => Promise<boolean>
  onDismissDuplicate: () => void
}

export function EscrowTransactionForm({
  onCancel,
  onSaved,
  initialValues,
  saving,
  error,
  onSave,
  statementDate,
  duplicateMessage,
  onConfirmDuplicate,
  onDismissDuplicate,
}: EscrowTransactionFormProps) {
  const [values, setValues] = useState<MortgageEscrowTransactionInput>(initialValues)
  const [historySelected, setHistorySelected] = useState(false)
  const reset = () => {
    setValues(initialValues)
    setHistorySelected(false)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || duplicateMessage) return
    const succeeded = await onSave(values, effectiveHistoryOnly(values.transaction_date, statementDate, historySelected))
    if (succeeded) { reset(); onSaved?.() }
  }

  return (
    <form className="escrow-transaction-form" onSubmit={handleSubmit}>
      {!onCancel && <h3>Add escrow entry</h3>}
      {error && <p role="alert">{error}</p>}
      {duplicateMessage && (
        <DuplicateEntryPrompt
          message={duplicateMessage}
          busy={saving}
          onConfirm={async () => {
            if (await onConfirmDuplicate()) { reset(); onSaved?.() }
          }}
          onDismiss={onDismissDuplicate}
        />
      )}

      <fieldset className="mortgage-entry-fields" aria-label="Escrow details" disabled={saving || !!duplicateMessage}>
      <label htmlFor="escrow_transaction_date">
        Date<span className="required-marker">*</span>
      </label>
      <input
        id="escrow_transaction_date"
        type="date"
        required
        value={values.transaction_date}
        onChange={(e) => setValues((prev) => ({ ...prev, transaction_date: e.target.value }))}
      />

      <label htmlFor="escrow_transaction_type">Type</label>
      <select
        id="escrow_transaction_type"
        value={values.transaction_type}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, transaction_type: e.target.value as EscrowTransactionType }))
        }
      >
        <option value="deposit">Deposit (into escrow)</option>
        <option value="disbursement">Disbursement (paid out of escrow)</option>
      </select>

      <label htmlFor="escrow_amount">
        Amount ($)<span className="required-marker">*</span>
      </label>
      <input
        id="escrow_amount"
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        required
        value={values.amount}
        onChange={(e) => setValues((prev) => ({ ...prev, amount: e.target.value }))}
      />

      <label htmlFor="escrow_description">Description</label>
      <input
        id="escrow_description"
        placeholder="e.g. Property tax installment, Homeowners insurance renewal"
        value={values.description ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value || null }))}
      />


      <HistoryChoiceField
        idPrefix="escrow"
        entryDate={values.transaction_date}
        statementDate={statementDate}
        historyOnly={historySelected}
        onChange={setHistorySelected}
      />
      </fieldset>
      {!duplicateMessage && <div className="form-actions">
      {onCancel && <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>}
      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      </div>}
    </form>
  )
}
