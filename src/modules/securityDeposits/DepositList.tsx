import { depositBalance } from './useSecurityDeposits'
import { DEPOSIT_TRANSACTION_TYPE_LABELS, type SecurityDeposit } from './securityDepositsQueries'

interface DepositListProps {
  deposits: SecurityDeposit[]
  // Box interaction standard: the box's default view state shows plain
  // read-only balances/ledger rows, no Log/Void actions.
  readOnly?: boolean
  onLogTransaction: (depositId: string) => void
  onVoidTransaction: (transactionId: string) => void
}

export function DepositList({ deposits, readOnly = false, onLogTransaction, onVoidTransaction }: DepositListProps) {
  if (deposits.length === 0) {
    return <p className="empty-state">No security deposits yet — log the first one to keep it on record.</p>
  }

  return (
    <>
      {deposits.map((deposit) => {
        const balance = depositBalance(deposit)
        const sortedTransactions = [...deposit.transactions].sort((a, b) =>
          a.transaction_date < b.transaction_date ? 1 : -1,
        )

        return (
          <section key={deposit.id}>
            <h3>
              {deposit.unit ? `${deposit.unit} — ` : ''}
              {deposit.tenant_name}
            </h3>
            <p>
              Received: ${balance.received.toFixed(2)} · Returned: ${balance.returned.toFixed(2)} · Applied to
              damages: ${balance.appliedToDamages.toFixed(2)} · <strong>Remaining balance: ${balance.remaining.toFixed(2)}</strong>
            </p>
            {deposit.notes && <p>Notes: {deposit.notes}</p>}

            {!readOnly && (
              <button type="button" onClick={() => onLogTransaction(deposit.id)} disabled={balance.remaining <= 0}>
                Log return / damages
              </button>
            )}

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Posted to</th>
                    <th>Description</th>
                    {!readOnly && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((tx) => (
                    <tr key={tx.id} className={tx.voided ? 'row-voided' : undefined}>
                      <td>{tx.transaction_date}</td>
                      <td>
                        {DEPOSIT_TRANSACTION_TYPE_LABELS[tx.transaction_type]}
                        {tx.voided ? ' (voided)' : ''}
                      </td>
                      <td>${tx.amount.toFixed(2)}</td>
                      <td>
                        {tx.chart_account ? `${tx.chart_account.name} (${tx.chart_account.type})` : '—'}
                      </td>
                      <td>{tx.description ?? ''}</td>
                      {!readOnly && (
                        <td>
                          {!tx.voided && (
                            <button type="button" onClick={() => onVoidTransaction(tx.id)}>
                              Void
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </>
  )
}
