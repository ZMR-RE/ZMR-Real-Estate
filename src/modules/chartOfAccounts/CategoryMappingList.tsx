import type { ChartAccount } from './chartOfAccountsQueries'
import type { Category } from '../financials/financialsQueries'

interface MappingRow {
  mapping: { id: string; category: Category; chart_account_id: string }
  categoryLabel: string
  pendingChartAccountId: string | null
}

interface CategoryMappingListProps {
  rows: MappingRow[]
  accounts: ChartAccount[]
  savingMappingId: string | null
  onChange: (mappingId: string, chartAccountId: string) => void
  onSave: (mappingId: string) => void
  onCancel: (mappingId: string) => void
}

export function CategoryMappingList({ rows, accounts, savingMappingId, onChange, onSave, onCancel }: CategoryMappingListProps) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Financials category</th>
            <th>Mapped to account</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ mapping, categoryLabel, pendingChartAccountId }) => {
            const hasPendingChange = pendingChartAccountId !== null && pendingChartAccountId !== mapping.chart_account_id
            const selectValue = pendingChartAccountId ?? mapping.chart_account_id
  
            return (
              <tr key={mapping.id}>
                <td>{categoryLabel}</td>
                <td>
                  <select value={selectValue} onChange={(e) => onChange(mapping.id, e.target.value)}>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {hasPendingChange && (
                    <>
                      <button type="button" onClick={() => onSave(mapping.id)} disabled={savingMappingId === mapping.id}>
                        {savingMappingId === mapping.id ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => onCancel(mapping.id)} disabled={savingMappingId === mapping.id}>
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
