import { useTransactionAuditHistory } from './useTransactionAuditHistory'

interface TransactionAuditHistoryProps {
  transactionId: string
}

// Roadmap 9.17 — per-transaction edit/void history, reusing the 7.8
// audit_log infrastructure (extended to financial_transactions by
// 20260911100000_audit_trail_financial_transactions.sql). Voiding a
// transaction shows up here like any other edit, since it's just an
// update of voided/voided_at under the hood.
export function TransactionAuditHistory({ transactionId }: TransactionAuditHistoryProps) {
  const { rows, loading, error } = useTransactionAuditHistory(transactionId)

  if (loading) {
    return <p>Loading history…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (rows.length === 0) {
    return <p className="empty-state">No changes logged yet.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.changedAt}</td>
              <td>
                {row.who} changed {row.field} from &lsquo;{row.formattedOldValue}&rsquo; to &lsquo;
                {row.formattedNewValue}&rsquo;
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
