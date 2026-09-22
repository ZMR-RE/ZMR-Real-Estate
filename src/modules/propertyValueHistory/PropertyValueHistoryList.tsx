import type { PropertyValueLogEntry } from './propertyValueHistoryQueries'

interface PropertyValueHistoryListProps {
  entries: PropertyValueLogEntry[]
  // Roadmap 7.25 — Box interaction standard: the box's default view
  // state shows plain read-only labels, no per-row Void. Same pattern
  // as FinancialAccountList/InsuranceLedgerList's readOnly prop.
  readOnly?: boolean
  onVoid?: (id: string) => void
  voiding?: boolean
  emptyMessage: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

// Newest first (query already orders by entry_date desc) — a trend reads
// most naturally most-recent-on-top, same convention as every other
// dated ledger in this app (payments, escrow, tax installments).
export function PropertyValueHistoryList({
  entries,
  readOnly = false,
  onVoid,
  voiding,
  emptyMessage,
}: PropertyValueHistoryListProps) {
  if (entries.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Value</th>
          <th>Source</th>
          {!readOnly && <th></th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className={entry.voided ? 'row-voided' : undefined}>
            <td>{entry.entry_date}</td>
            <td>
              {currencyFormatter.format(Number(entry.value))}
              {entry.voided ? ' (voided)' : ''}
            </td>
            <td>{entry.source}</td>
            {!readOnly && (
              <td>
                {!entry.voided && (
                  <button type="button" onClick={() => onVoid?.(entry.id)} disabled={voiding}>
                    Void
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
