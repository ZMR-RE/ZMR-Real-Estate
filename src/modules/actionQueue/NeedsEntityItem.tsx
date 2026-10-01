import { Link } from 'react-router-dom'

interface NeedsEntityItemProps {
  byYear: { year: number; count: number }[]
  total: number
  error: string | null
}

// Entity books: transactions with no responsible entity confirmed. Each
// year links to Financials filtered to exactly those transactions.
export function NeedsEntityItem({ byYear, total, error }: NeedsEntityItemProps) {
  if (error) return <p role="alert">{error}</p>
  if (total === 0) return null
  return (
    <section className="card" aria-labelledby="needs_entity_heading">
      <h2 id="needs_entity_heading" className="property-details-title">
        Needs entity <span className="status-badge status-badge-warning">{total}</span>
      </h2>
      <p>
        {total === 1 ? '1 transaction has' : `${total} transactions have`} no entity assigned. They count in portfolio and
        property totals, but not in any entity's books, until you choose one.
      </p>
      <ul>
        {byYear.map(({ year, count }) => (
          <li key={year}>
            <Link to={`/financials?needs=entity&year=${year}`}>
              {year}: {count} {count === 1 ? 'transaction' : 'transactions'}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
