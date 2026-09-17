import { FinancialAccountForm } from './FinancialAccountForm'
import type { FinancialAccount, FinancialAccountInput } from './financialAccountsQueries'

interface FinancialAccountListProps {
  accounts: FinancialAccount[]
  editingId: string | null
  saving: boolean
  onStartEditing: (id: string) => void
  onSave: (id: string, input: FinancialAccountInput) => void
  onCancel: () => void
  onToggleArchived: (financialAccount: FinancialAccount) => void
}

const TYPE_LABELS: Record<FinancialAccount['account_type'], string> = {
  bank: 'Bank account',
  credit_card: 'Credit card',
}

export function FinancialAccountList({
  accounts,
  editingId,
  saving,
  onStartEditing,
  onSave,
  onCancel,
  onToggleArchived,
}: FinancialAccountListProps) {
  if (accounts.length === 0) {
    return <p className="empty-state">No financial accounts on file yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Nickname</th>
          <th>Type</th>
          <th>Last 4</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((financialAccount) =>
          editingId === financialAccount.id ? (
            <tr key={financialAccount.id}>
              <td colSpan={5}>
                <FinancialAccountForm
                  initialValues={financialAccount}
                  saving={saving}
                  onSave={(input) => onSave(financialAccount.id, input)}
                  onCancel={onCancel}
                />
              </td>
            </tr>
          ) : (
            <tr key={financialAccount.id} className={financialAccount.archived ? 'row-voided' : ''}>
              <td>{financialAccount.nickname}</td>
              <td>{TYPE_LABELS[financialAccount.account_type]}</td>
              <td>•••• {financialAccount.last_four}</td>
              <td>
                <span className={`status-badge ${financialAccount.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
                  {financialAccount.archived ? 'Archived' : 'Active'}
                </span>
              </td>
              <td>
                <button type="button" onClick={() => onStartEditing(financialAccount.id)}>
                  Edit
                </button>
                <button type="button" onClick={() => onToggleArchived(financialAccount)}>
                  {financialAccount.archived ? 'Restore' : 'Archive'}
                </button>
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  )
}
