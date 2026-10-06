import { CurrencyAmountInput } from '../../shared/CurrencyAmountInput'
import { currencyAmountError } from '../../shared/currencyAmount'
import { useState, type FormEvent } from 'react'
import type { ExtraPaymentMode } from './mortgagePayoffMath'

interface MortgagePayoffScenarioFormProps {
  extraAmount: string
  onExtraAmountChange: (value: string) => void
  extraMode: ExtraPaymentMode
  onExtraModeChange: (mode: ExtraPaymentMode) => void
  error: string | null
  onCalculate: () => void
}

export function MortgagePayoffScenarioForm({
  extraAmount,
  onExtraAmountChange,
  extraMode,
  onExtraModeChange,
  error,
  onCalculate,
}: MortgagePayoffScenarioFormProps) {
  const [amountError, setAmountError] = useState<string | null>(null)
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const invalid =
      currencyAmountError(extraAmount, {required:true,min:'0',max:'9999999999.99'})
    if (invalid) { setAmountError(invalid); return }
    setAmountError(null)
    onCalculate()
  }

  return (
    <form className="mortgage-payoff-scenario-form" onSubmit={handleSubmit}>
      <h2>Payoff scenario</h2>

      <label htmlFor="extra_amount">
        Extra payment ($)<span className="required-marker">*</span>
      </label>
      <CurrencyAmountInput
        id="extra_amount"
        max="9999999999.99"

        min="0"

        value={extraAmount}
        onValueChange={(value) => onExtraAmountChange(value)}
        required
      />

      <div role="group" aria-label="Extra payment type">
        <label>
          <input
            type="radio"
            name="extra_mode"
            value="recurring"
            checked={extraMode === 'recurring'}
            onChange={() => onExtraModeChange('recurring')}
          />
          Recurring monthly
        </label>
        <label>
          <input
            type="radio"
            name="extra_mode"
            value="oneTime"
            checked={extraMode === 'oneTime'}
            onChange={() => onExtraModeChange('oneTime')}
          />
          One-time
        </label>
      </div>

      {amountError && <p role="alert">{amountError}</p>}
      {error && <p role="alert">{error}</p>}

      <button type="submit">Calculate</button>
    </form>
  )
}
