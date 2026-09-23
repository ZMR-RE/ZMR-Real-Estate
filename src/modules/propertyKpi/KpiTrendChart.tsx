import { useState } from 'react'
import type { KpiTrendSeries } from './useKpiTrendChart'

interface KpiTrendChartProps {
  series: KpiTrendSeries[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const WIDTH = 600
const HEIGHT = 220
const PADDING = 36

// Roadmap 7.38 (2) — three colors purely as line differentiators, not
// status signals (same exemption index.css's own contextual card tints
// already carry — "status meaning is never carried by the tint itself").
// No dedicated chart-palette tokens exist in this app, so this reuses
// --accent/--success/--warning rather than inventing new hex colors.
const SERIES_COLOR: Record<KpiTrendSeries['key'], string> = {
  market_value: 'var(--accent)',
  rent_value: 'var(--success)',
  property_tax: 'var(--warning)',
}

// Roadmap 7.38 (2) — Market value, Rent estimate, and Property tax paid
// on one shared per-year time axis, each independently toggleable. X
// domain (year range) is fixed across all 3 series regardless of which
// are visible, so toggling a series never shifts the timeline; the Y
// domain (dollar range) recomputes from only the currently-visible
// series each time, so hiding Market value (hundreds of thousands)
// lets Property tax paid (a few thousand) actually read as a real trend
// instead of a flat line pinned near zero on a shared linear axis.
export function KpiTrendChart({ series }: KpiTrendChartProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(series.map((s) => [s.key, true])),
  )

  const allPoints = series.flatMap((s) => s.points)
  if (allPoints.length === 0) {
    return <p className="empty-state">Not enough data yet — log a market value, rent estimate, or tax installment to see a trend.</p>
  }

  const years = allPoints.map((p) => p.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const yearRange = maxYear - minYear || 1

  const visibleSeries = series.filter((s) => visible[s.key] && s.points.length > 0)
  const visibleValues = visibleSeries.flatMap((s) => s.points.map((p) => p.value))
  const minValue = visibleValues.length > 0 ? Math.min(0, ...visibleValues) : 0
  const maxValue = visibleValues.length > 0 ? Math.max(...visibleValues) : 1
  const valueRange = maxValue - minValue || 1

  const toX = (year: number) => PADDING + ((year - minYear) / yearRange) * (WIDTH - PADDING * 2)
  const toY = (value: number) => HEIGHT - PADDING - ((value - minValue) / valueRange) * (HEIGHT - PADDING * 2)

  const toggle = (key: string) => setVisible((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="kpi-trend-chart">
      <div className="kpi-trend-chart-legend">
        {series.map((s) => (
          <label key={s.key} className="kpi-trend-chart-legend-item">
            <input type="checkbox" checked={visible[s.key]} onChange={() => toggle(s.key)} />
            <span className="kpi-trend-chart-swatch" style={{ background: SERIES_COLOR[s.key] }} />
            {s.label}
            {s.points.length === 0 && ' (no data)'}
          </label>
        ))}
      </div>

      {visibleSeries.length === 0 ? (
        <p className="empty-state">No series selected.</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Market value, rent estimate, and property tax paid over time">
          <text x={PADDING} y={14} className="value-trend-chart-label">
            {currencyFormatter.format(maxValue)}
          </text>
          <text x={PADDING} y={HEIGHT - PADDING + 16} className="value-trend-chart-label">
            {currencyFormatter.format(minValue)}
          </text>
          <text x={PADDING} y={HEIGHT - 6} className="value-trend-chart-label">
            {minYear}
          </text>
          <text x={WIDTH - PADDING} y={HEIGHT - 6} textAnchor="end" className="value-trend-chart-label">
            {maxYear}
          </text>

          {visibleSeries.map((s) => {
            const points = s.points.map((p) => ({ x: toX(p.year), y: toY(p.value), point: p }))
            const path = points.map((p) => `${p.x},${p.y}`).join(' ')
            const color = SERIES_COLOR[s.key]
            return (
              <g key={s.key}>
                {points.length > 1 && (
                  <polyline points={path} fill="none" stroke={color} strokeWidth={2} />
                )}
                {points.map((p) => (
                  <circle key={p.point.year} cx={p.x} cy={p.y} r={3} fill={color}>
                    <title>{`${s.label}, ${p.point.year}: ${currencyFormatter.format(p.point.value)}`}</title>
                  </circle>
                ))}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
