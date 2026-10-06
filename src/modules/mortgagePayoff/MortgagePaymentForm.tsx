import { CurrencyAmountInput } from '../../shared/CurrencyAmountInput'
import { currencyAmountError, formatCurrencyAmount } from '../../shared/currencyAmount'
import { useState, type FormEvent } from 'react'
import { DuplicateEntryPrompt } from './DuplicateEntryPrompt'
import { HistoryChoiceField } from './HistoryChoiceField'
import { effectiveHistoryOnly } from './mortgageHistoryEntry'
import type { MortgagePaymentInput } from './mortgagePayoffQueries'

interface MortgagePaymentFormProps {
  onCancel?: () => void
  onSaved?: () => void
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
}: MortgagePaymentFormProps) {
  const [values, setValues] = useState<MortgagePaymentInput>(initialValues)
  const [historySelected, setHistorySelected] = useState(false)
  const reset = () => {
    setValues(initialValues)
    setHistorySelected(false)
  }

  const [amountError, setAmountError] = useState<string | null>(null)
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const invalid =
      currencyAmountError(values.amount, {required:true,min:'0.01',max:'99999999.99'}) ||
      currencyAmountError(values.principal_amount, {required:true,min:'0',max:'99999999.99'}) ||
      currencyAmountError(values.interest_amount, {required:true,min:'0',max:'99999999.99'})
    if (invalid) { setAmountError(invalid); return }
    setAmountError(null)
    if (saving || duplicateMessage) return
    const succeeded = await onSave({...values, amount:formatCurrencyAmount(values.amount), principal_amount:formatCurrencyAmount(values.principal_amount), interest_amount:formatCurrencyAmount(values.interest_amount)}, effectiveHistoryOnly(values.payment_date, statementDate, historySelected))
    if (succeeded) { reset(); onSaved?.() }
  }

  return (
    <form className="mortgage-payment-form" onSubmit={handleSubmit}>
      {!onCancel && <h3>Add payment</h3>}
      {amountError && <p role="alert">{amountError}</p>}
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

      <fieldset className="mortgage-entry-fields" aria-label="Payment details" disabled={saving || !!duplicateMessage}>
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
      <CurrencyAmountInput
        id="payment_amount"
        max="99999999.99"

        min="0.01"

        required
        value={values.amount}
        onValueChange={(value) => setValues((prev) => ({ ...prev, amount: value }))}
      />

      <label htmlFor="principal_amount">
        Principal ($)<span className="required-marker">*</span>
      </label>
      <CurrencyAmountInput
        id="principal_amount"
        max="99999999.99"

        min="0"

        required
        value={values.principal_amount}
        onValueChange={(value) => setValues((prev) => ({ ...prev, principal_amount: value }))}
      />

      <label htmlFor="interest_amount">
        Interest ($)<span className="required-marker">*</span>
      </label>
      <CurrencyAmountInput
        id="interest_amount"
        max="99999999.99"

        min="0"

        required
        value={values.interest_amount}
        onValueChange={(value) => setValues((prev) => ({ ...prev, interest_amount: value }))}
      />

      <HistoryChoiceField
        idPrefix="payment"
        entryDate={values.payment_date}
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
