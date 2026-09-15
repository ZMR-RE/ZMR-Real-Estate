import { Fragment, useState } from 'react'
import { propertyLabel } from '../../shared/propertyLabel'
import { CATEGORY_LABELS, type Transaction } from './financialsQueries'
import { TransactionDocuments } from './TransactionDocuments'
import { TransactionAuditHistory } from './TransactionAuditHistory'

interface TransactionListProps {
  transactions: Transaction[]
  onSelect: (id: string) => void
  onVoid: (id: string) => void
  onApplySplit: (transaction: Transaction) => void
  reimbursedSourceIds: Set<string>
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

export function TransactionList({
  transactions,
  onSelect,
  onVoid,
  onApplySplit,
  reimbursedSourceIds,
  applyingSplit,
}: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  if (transactions.length === 0) {
    return <p>No transactions for this filter.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Property</th>
          <th>Type</th>
          <th>Category</th>
          <th>Description</th>
          <th>Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <Fragment key={tx.id}>
            <tr>
              <td>{tx.transaction_date}</td>
              <td>{propertyLabel(tx.property)}</td>
              <td>{tx.entry_type === 'income' ? 'Income' : 'Expense'}</td>
              <td>{CATEGORY_LABELS[tx.category]}</td>
              <td>{tx.description ?? ''}</td>
              <td>${tx.amount.toFixed(2)}</td>
              <td>
                <button type="button" onClick={() => onSelect(tx.id)}>
                  Edit
                </button>
                <button type="button" onClick={() => onVoid(tx.id)}>
                  Void
                </button>
                {tx.property && (
                  <button type="button" onClick={() => setExpandedId((id) => (id === tx.id ? null : tx.id))}>
                    {expandedId === tx.id ? 'Hide documents' : 'Documents'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedHistoryId((id) => (id === tx.id ? null : tx.id))}
                >
                  {expandedHistoryId === tx.id ? 'Hide history' : 'History'}
                </button>
                {canApplySplit(tx, reimbursedSourceIds) && (
                  <button type="button" onClick={() => onApplySplit(tx)} disabled={applyingSplit}>
                    Apply saved split ({tx.vendor?.split_percentage}%
                    {tx.vendor?.split_description ? ` — ${tx.vendor.split_description}` : ''})
                  </button>
                )}
              </td>
            </tr>
            {expandedId === tx.id && tx.property && (
              <tr>
                <td colSpan={7}>
                  <TransactionDocuments transactionId={tx.id} propertyId={tx.property.id} />
                </td>
              </tr>
            )}
            {expandedHistoryId === tx.id && (
              <tr>
                <td colSpan={7}>
                  <TransactionAuditHistory transactionId={tx.id} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
