import { exportTableToCsv, exportTableToPdf } from '../../shared/exporting/tableExport'
import { CATEGORY_LABELS, type Transaction } from './financialsQueries'

interface TransactionListExportProps {
  transactions: Transaction[]
  year: number
}

const COLUMNS = ['Date', 'Property', 'Type', 'Category', 'Description', 'Amount']

function toRows(transactions: Transaction[]): string[][] {
  return transactions.map((tx) => [
    tx.transaction_date,
    tx.property?.name ?? '—',
    tx.entry_type === 'income' ? 'Income' : 'Expense',
    CATEGORY_LABELS[tx.category],
    tx.description ?? '',
    tx.amount.toFixed(2),
  ])
}

// Roadmap 9.11 — plain export of the transaction list exactly as shown
// on screen (respects whatever filter produced `transactions`), distinct
// from the existing tax-year CSV export's specialized summary format.
export function TransactionListExport({ transactions, year }: TransactionListExportProps) {
  const disabled = transactions.length === 0

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => exportTableToCsv(`zmr-transactions-${year}.csv`, COLUMNS, toRows(transactions))}
      >
        Export list (CSV)
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          exportTableToPdf(`zmr-transactions-${year}.pdf`, `ZMR Real Estate — Transactions (${year})`, COLUMNS, toRows(transactions))
        }
      >
        Export list (PDF)
      </button>
    </>
  )
}
