import { historyChoice } from './mortgageHistoryEntry'

interface HistoryChoiceFieldProps {
  idPrefix: string
  entryDate: string
  statementDate: string | null | undefined
  historyOnly: boolean
  onChange: (historyOnly: boolean) => void
}

// Option B: for an entry dated on or before the balance's statement date, ask whether the statement balance already
// includes it. Never chosen silently: "Changes the balance" stays the default.
export function HistoryChoiceField({ idPrefix, entryDate, statementDate, historyOnly, onChange }: HistoryChoiceFieldProps) {
  const choice = historyChoice(entryDate, statementDate)
  if (choice.kind === 'not_eligible') return null
  if (choice.kind === 'unavailable') return <p className="field-hint">{choice.reason}</p>
  return (
    <fieldset>
      <legend>This entry is dated on or before your statement date ({statementDate})</legend>
      <label htmlFor={`${idPrefix}_changes_balance`}>
        <input id={`${idPrefix}_changes_balance`} type="radio" name={`${idPrefix}_history`} checked={!historyOnly} onChange={() => onChange(false)} />
        Changes the balance (a new entry)
      </label>
      <label htmlFor={`${idPrefix}_history_only`}>
        <input id={`${idPrefix}_history_only`} type="radio" name={`${idPrefix}_history`} checked={historyOnly} onChange={() => onChange(true)} />
        Already included in my opening balance (history only; the balance doesn't change)
      </label>
    </fieldset>
  )
}

