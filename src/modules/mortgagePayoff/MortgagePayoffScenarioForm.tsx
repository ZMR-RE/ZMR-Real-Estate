import type { FormEvent } from 'react'
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
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onCalculate()
  }

  return (
    <form className="mortgage-payoff-scenario-form" onSubmit={handleSubmit}>
      <h2>Payoff scenario</h2>

      <label htmlFor="extra_amount">Extra payment ($)</label>
      <input
        id="extra_amount"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={extraAmount}
        onChange={(e) => onExtraAmountChange(e.target.value)}
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

      {error && <p role="alert">{error}</p>}

      <button type="submit">Calculate</button>
    </form>
  )
}
