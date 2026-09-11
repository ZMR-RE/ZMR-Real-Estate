import { Fragment, useState } from 'react'
import { CATEGORY_LABELS, type Transaction } from './financialsQueries'
import { TransactionDocuments } from './TransactionDocuments'

interface TransactionListProps {
  transactions: Transaction[]
  onSelect: (id: string) => void
  onVoid: (id: string) => void
}

export function TransactionList({ transactions, onSelect, onVoid }: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
              <td>{tx.property?.name ?? '—'}</td>
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
              </td>
            </tr>
            {expandedId === tx.id && tx.property && (
              <tr>
                <td colSpan={7}>
                  <TransactionDocuments transactionId={tx.id} propertyId={tx.property.id} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
