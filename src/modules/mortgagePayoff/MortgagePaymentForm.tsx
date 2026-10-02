import { useState, type FormEvent } from 'react'
import { DuplicateEntryPrompt } from './DuplicateEntryPrompt'
import { HistoryChoiceField } from './HistoryChoiceField'
import { effectiveHistoryOnly } from './mortgageHistoryEntry'
import type { MortgagePaymentInput } from './mortgagePayoffQueries'

interface MortgagePaymentFormProps {
  initialValues: MortgagePaymentInput
  saving: boolean
  error: string | null
  onSave: (input: MortgagePaymentInput, historyOnly: boolean) => Promise<boolean>
  // Option B: the balance's statement date (null = unknown) decides whether "history only" is offered.
  statementDate: string | null | undefined
  // An identical entry exists (nothing saved; values kept) — "Record anyway" resubmits with the shown count.
  duplicateMessage: string | null
  onConfirmDuplicate: () => Promise<boolean>
  onDismissDuplicate: () => void
}

export function MortgagePaymentForm({
  initialValues,
  saving,
  error,
  onSave,
  statementDate,
  duplicateMessage,
  onConfirmDuplicate,
  onDismissDuplicate,
}: MortgagePaymentFormProps) {
  const [values, setValues] = useState<MortgagePaymentInput>(initialValues)
  const [historySelected, setHistorySelected] = useState(false)
  const reset = () => {
    setValues(initialValues)
    setHistorySelected(false)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const succeeded = await onSave(values, effectiveHistoryOnly(values.payment_date, statementDate, historySelected))
    if (succeeded) reset()
  }

  return (
    <form className="mortgage-payment-form" onSubmit={handleSubmit}>
      <h3>Log a payment</h3>
      {error && <p role="alert">{error}</p>}
      {duplicateMessage && (
        <DuplicateEntryPrompt
          message={duplicateMessage}
          busy={saving}
          onConfirm={async () => {
            if (await onConfirmDuplicate()) reset()
          }}
          onDismiss={onDismissDuplicate}
        />
      )}

      <label htmlFor="payment_date">
        Date<span className="required-marker">*</span>
      </label>
      <input
        id="payment_date"
        type="date"
        required
        value={values.payment_date}
        onChange={(e) => setValues((prev) => ({ ...prev, payment_date: e.target.value }))}
      />

      <label htmlFor="payment_amount">
        Total amount ($)<span className="required-marker">*</span>
      </label>
      <input
        id="payment_amount"
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        required
        value={values.amount}
        onChange={(e) => setValues((prev) => ({ ...prev, amount: e.target.value }))}
      />

      <label htmlFor="principal_amount">
        Principal ($)<span className="required-marker">*</span>
      </label>
      <input
        id="principal_amount"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        required
        value={values.principal_amount}
        onChange={(e) => setValues((prev) => ({ ...prev, principal_amount: e.target.value }))}
      />

      <label htmlFor="interest_amount">
        Interest ($)<span className="required-marker">*</span>
      </label>
      <input
        id="interest_amount"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        required
        value={values.interest_amount}
        onChange={(e) => setValues((prev) => ({ ...prev, interest_amount: e.target.value }))}
      />


      <HistoryChoiceField
        idPrefix="payment"
        entryDate={values.payment_date}
        statementDate={statementDate}
        historyOnly={historySelected}
        onChange={setHistorySelected}
      />
      <button type="submit" disabled={saving}>
        {saving ? 'Logging…' : 'Log payment'}
      </button>
    </form>
  )
}
