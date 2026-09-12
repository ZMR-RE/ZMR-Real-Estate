import { exportTableToCsv, exportTableToPdf } from '../../shared/exporting/tableExport'
import { ACCOUNT_TYPE_LABELS, type ChartAccount } from './chartOfAccountsQueries'

interface AccountListExportProps {
  accounts: ChartAccount[]
}

const COLUMNS = ['Type', 'Account name', 'Description']

function toRows(accounts: ChartAccount[]): string[][] {
  return accounts.map((account) => [ACCOUNT_TYPE_LABELS[account.type], account.name, account.description ?? ''])
}

// Roadmap 9.11 — plain export of the Chart of Accounts list, flattening
// AccountList's per-type grouping into one table with an explicit Type
// column.
export function AccountListExport({ accounts }: AccountListExportProps) {
  const disabled = accounts.length === 0

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => exportTableToCsv('zmr-chart-of-accounts.csv', COLUMNS, toRows(accounts))}
      >
        Export list (CSV)
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          exportTableToPdf('zmr-chart-of-accounts.pdf', 'ZMR Real Estate — Chart of Accounts', COLUMNS, toRows(accounts))
        }
      >
        Export list (PDF)
      </button>
    </>
  )
}
