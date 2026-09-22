import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type ChartAccount } from './chartOfAccountsQueries'

interface AccountListProps {
  accounts: ChartAccount[]
  editingAccountId: string | null
  onEdit: (id: string) => void
}

export function AccountList({ accounts, editingAccountId, onEdit }: AccountListProps) {
  return (
    <>
      {ACCOUNT_TYPES.map((type) => {
        const accountsForType = accounts.filter((a) => a.type === type)
        if (accountsForType.length === 0) return null

        return (
          <section key={type}>
            <h3>{ACCOUNT_TYPE_LABELS[type]}</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Account name</th>
                    <th>Description</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {accountsForType.map((account) => (
                    <tr key={account.id}>
                      <td>{account.name}</td>
                      <td>{account.description}</td>
                      <td>
                        <button type="button" onClick={() => onEdit(account.id)} disabled={editingAccountId === account.id}>
                          Edit
                        </button>
                      </td>
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
