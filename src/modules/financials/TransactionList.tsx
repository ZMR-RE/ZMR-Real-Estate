import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { propertyLabel } from '../../shared/propertyLabel'
import { CATEGORY_LABELS, type Transaction } from './financialsQueries'
import { formatMoney, ledgerTreatment, payerName } from './financialsCalculations'
import { describeTransaction } from './transactionEntry'
import { TransactionDocuments } from './TransactionDocuments'
import { TransactionAuditHistory } from './TransactionAuditHistory'

interface TransactionListProps {
  transactions: Transaction[]
  // Shown only when "Show voided" is on; display-only, never totaled.
  voidedTransactions: Transaction[]
  onSelect: (transaction: Transaction) => void
  onVoid: (id: string) => Promise<string | null>
  onApplySplit: (transaction: Transaction) => void
  reimbursedSourceIds: Set<string>
  // Roadmap 9.9 — the transaction→capture half of the bridge's
  // traceable link; ids of currently-loaded transactions that
  // originated from a reconciled Quick Capture receipt.
  capturedTransactionIds: Set<string>
  applyingSplit: boolean
}

function canApplySplit(tx: Transaction, reimbursedSourceIds: Set<string>): boolean {
  return (
    tx.entry_type === 'expense' &&
    tx.vendor?.split_percentage != null &&
    !tx.reimbursement_source_id &&
    !reimbursedSourceIds.has(tx.id)
  )
}

const COLUMN_COUNT = 7

// M3 — every field and action stays reachable at every width: action
// buttons wrap instead of overflowing the table, and at phone width each
// row becomes a stacked card (.transaction-list) so amount and actions
// never need a sideways scroll. Void asks for confirmation inline and
// says what happens; voided rows can be shown, clearly marked, and are
// never part of totals or exports.
export function TransactionList({
  transactions,
  voidedTransactions,
  onSelect,
  onVoid,
  onApplySplit,
  reimbursedSourceIds,
  capturedTransactionIds,
  applyingSplit,
}: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [confirmingVoidId, setConfirmingVoidId] = useState<string | null>(null)
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [voidError, setVoidError] = useState<{ id: string; message: string } | null>(null)

  const rows = [...transactions, ...voidedTransactions].sort(
    (a, b) => b.transaction_date.localeCompare(a.transaction_date) || Number(a.voided) - Number(b.voided),
  )

  if (rows.length === 0) {
    return <p className="empty-state">No transactions for this filter.</p>
  }

  const confirmVoid = async (tx: Transaction) => {
    setVoidingId(tx.id)
    const message = await onVoid(tx.id)
    setVoidingId(null)
    if (message) {
      setVoidError({ id: tx.id, message })
      return
    }
    setVoidError(null)
    setConfirmingVoidId(null)
  }

  return (
    <div className="table-scroll transaction-list-container">
      <table className="transaction-list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Property</th>
            <th>Type</th>
            <th>Paid to / from</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => {
            const property = propertyLabel(tx.property)
            const improvement = ledgerTreatment(tx) === 'capital_improvement'
            return (
              <Fragment key={tx.id}>
                <tr className={tx.voided ? 'row-voided' : undefined}>
                  <td data-label="Date">
                    {tx.transaction_date}
                    {tx.voided && (
                      <>
                        {' '}
                        <span className="status-badge status-badge-neutral">Voided</span>
                      </>
                    )}
                  </td>
                  <td data-label="Property" className="transaction-list-wrap">
                    {property}
                  </td>
                  <td data-label="Type" className="transaction-list-wrap">
                    {tx.entry_type === 'income' ? 'Income' : 'Expense'} · {CATEGORY_LABELS[tx.category]}
                    {improvement && ' · Capital improvement'}
                  </td>
                  <td data-label="Paid to / from" className="transaction-list-wrap">
                    {payerName(tx) || '—'}
                  </td>
                  <td data-label="Description" className="transaction-list-wrap">
                    {tx.description ?? ''}
                    {capturedTransactionIds.has(tx.id) && (
                      <>
                        {' '}
                        <Link to="/capture">(from Quick Capture)</Link>
                      </>
                    )}
                  </td>
                  <td data-label="Amount" className="transaction-list-amount">
                    {formatMoney(Number(tx.amount))}
                  </td>
                  <td data-label="Actions" className="transaction-list-actions">
                    <div className="transaction-list-action-group">
                      {!tx.voided && (
                        <>
                          <button type="button" data-edit-transaction={tx.id} onClick={() => onSelect(tx)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            aria-expanded={confirmingVoidId === tx.id}
                            onClick={() => {
                              setVoidError(null)
                              setConfirmingVoidId((id) => (id === tx.id ? null : tx.id))
                            }}
                          >
                            Void
                          </button>
                        </>
                      )}
                      {tx.property && (
                        <button type="button" onClick={() => setExpandedId((id) => (id === tx.id ? null : tx.id))}>
                          {expandedId === tx.id ? 'Hide documents' : 'Documents'}
                        </button>
                      )}
                      <button type="button" onClick={() => setExpandedHistoryId((id) => (id === tx.id ? null : tx.id))}>
                        {expandedHistoryId === tx.id ? 'Hide history' : 'History'}
                      </button>
                      {!tx.voided && canApplySplit(tx, reimbursedSourceIds) && (
                        <button type="button" onClick={() => onApplySplit(tx)} disabled={applyingSplit}>
                          Apply saved split ({tx.vendor?.split_percentage}%
                          {tx.vendor?.split_description ? ` — ${tx.vendor.split_description}` : ''})
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {confirmingVoidId === tx.id && (
                  <tr className="transaction-list-detail">
                    <td colSpan={COLUMN_COUNT}>
                      <section className="transaction-void-confirm" aria-label="Confirm void">
                        <p>
                          <strong>Void this transaction?</strong> {describeTransaction(tx, property)}
                        </p>
                        <p className="field-hint">
                          It stays on record with its history and documents, and can be seen with “Show voided”, but it
                          no longer counts in totals, reports or exports. Voiding can’t be undone from this screen.
                        </p>
                        {voidError?.id === tx.id && <p role="alert">Not voided: {voidError.message}</p>}
                        <div className="transaction-list-action-group">
                          <button type="button" onClick={() => confirmVoid(tx)} disabled={voidingId === tx.id}>
                            {voidingId === tx.id ? 'Voiding…' : 'Void transaction'}
                          </button>
                          <button type="button" onClick={() => setConfirmingVoidId(null)} disabled={voidingId === tx.id}>
                            Keep it
                          </button>
                        </div>
                      </section>
                    </td>
                  </tr>
                )}
                {expandedId === tx.id && tx.property && (
                  <tr className="transaction-list-detail">
                    <td colSpan={COLUMN_COUNT}>
                      <TransactionDocuments transactionId={tx.id} propertyId={tx.property.id} />
                    </td>
                  </tr>
                )}
                {expandedHistoryId === tx.id && (
                  <tr className="transaction-list-detail">
                    <td colSpan={COLUMN_COUNT}>
                      <TransactionAuditHistory transactionId={tx.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
