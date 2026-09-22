import { useAuth } from '../../shared/auth/AuthContext'
import { useHoldingCompaniesView } from './useHoldingCompaniesView'

// Roadmap 8.2b — the missing display for 8.7's Holding Company -> LLC
// ownership: which Organization types (LLCs) a given Holding Company
// owns. Read-only — Holding Company/LLC creation and assignment already
// happen via their own add-new pickers (LlcForm's Holding company field,
// Settings' Organization types section).
export function HoldingCompaniesSection() {
  const { accountId } = useAuth()
  const { holdingCompanies, loading, error } = useHoldingCompaniesView(accountId)

  return (
    <section>
      <h2>Holding companies</h2>
      <p>Which Organization types (LLCs) each Holding Company owns.</p>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : holdingCompanies.length === 0 ? (
        <p className="empty-state">No Holding companies yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Holding company</th>
                <th>Owns</th>
              </tr>
            </thead>
            <tbody>
              {holdingCompanies.map((holdingCompany) => (
                <tr key={holdingCompany.id}>
                  <td>{holdingCompany.name}</td>
                  <td>{holdingCompany.llcNames.length > 0 ? holdingCompany.llcNames.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
