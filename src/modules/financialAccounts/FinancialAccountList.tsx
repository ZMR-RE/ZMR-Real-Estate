import { FinancialAccountForm } from './FinancialAccountForm'
import type { FinancialAccount, FinancialAccountInput } from './financialAccountsQueries'

interface FinancialAccountListProps {
  accounts: FinancialAccount[]
  // Roadmap 7.25 — Box interaction standard: the box's default view
  // state shows plain read-only labels, no per-row actions. Edit/Archive
  // (and the inline edit form) only render once the box's own Edit
  // action has been clicked, so all of those props are only required
  // when readOnly is false/omitted.
  readOnly?: boolean
  editingId?: string | null
  saving?: boolean
  onStartEditing?: (id: string) => void
  onSave?: (id: string, input: FinancialAccountInput) => void
  onCancel?: () => void
  onToggleArchived?: (financialAccount: FinancialAccount) => void
}

const TYPE_LABELS: Record<FinancialAccount['account_type'], string> = {
  bank: 'Bank account',
  credit_card: 'Credit card',
}

export function FinancialAccountList({
  accounts,
  readOnly = false,
  editingId,
  saving,
  onStartEditing,
  onSave,
  onCancel,
  onToggleArchived,
}: FinancialAccountListProps) {
  if (accounts.length === 0) {
    return <p className="empty-state">No financial accounts on file yet — add the first one whenever you're ready.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Nickname</th>
            <th>Type</th>
            <th>Last 4</th>
            <th>Status</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {accounts.map((financialAccount) =>
            !readOnly && editingId === financialAccount.id ? (
              <tr key={financialAccount.id}>
                <td colSpan={5}>
                  <FinancialAccountForm
                    initialValues={financialAccount}
                    saving={saving ?? false}
                    onSave={(input) => onSave?.(financialAccount.id, input)}
                    onCancel={() => onCancel?.()}
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
                {!readOnly && (
                  <td>
                    <button type="button" onClick={() => onStartEditing?.(financialAccount.id)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onToggleArchived?.(financialAccount)}>
                      {financialAccount.archived ? 'Restore' : 'Archive'}
                    </button>
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
