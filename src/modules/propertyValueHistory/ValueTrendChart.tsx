import type { PropertyValueLogEntry } from './propertyValueHistoryQueries'

interface ValueTrendChartProps {
  entries: PropertyValueLogEntry[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const WIDTH = 400
const HEIGHT = 120
const PADDING = 24

// Roadmap 7.32 (8) — a real inline chart (plain SVG, no charting
// library — none exists in this app, per MarketFinancialSnapshotCard's
// own comment explaining why its trend is a table instead; this item
// explicitly asks for a chart, unlike that one). x-position is
// proportional to actual entry_date (not just index order), so an
// unevenly-dated history still reads correctly. Voided entries are
// excluded — same "active" convention as that KPI-tab table.
export function ValueTrendChart({ entries }: ValueTrendChartProps) {
  const active = entries
    .filter((entry) => !entry.voided)
    .slice()
    .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

  if (active.length < 2) return null

  const dates = active.map((e) => new Date(e.entry_date).getTime())
  const values = active.map((e) => Number(e.value))
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const dateRange = maxDate - minDate || 1
  const valueRange = maxValue - minValue || 1

  const points = active.map((entry, i) => {
    const x = PADDING + ((dates[i] - minDate) / dateRange) * (WIDTH - PADDING * 2)
    const y = HEIGHT - PADDING - ((values[i] - minValue) / valueRange) * (HEIGHT - PADDING * 2)
    return { x, y, entry }
  })

  const path = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg className="value-trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Value trend over time">
      <polyline points={path} fill="none" className="value-trend-chart-line" />
      {points.map((p) => (
        <circle key={p.entry.id} cx={p.x} cy={p.y} r={3} className="value-trend-chart-dot">
          <title>{`${p.entry.entry_date}: ${currencyFormatter.format(Number(p.entry.value))}`}</title>
        </circle>
      ))}
      <text x={PADDING} y={12} className="value-trend-chart-label">
        {currencyFormatter.format(maxValue)}
      </text>
      <text x={PADDING} y={HEIGHT - 8} className="value-trend-chart-label">
        {currencyFormatter.format(minValue)}
      </text>
      <text x={WIDTH - PADDING} y={HEIGHT - 8} textAnchor="end" className="value-trend-chart-label">
        {active[active.length - 1].entry_date}
      </text>
    </svg>
  )
}
