import { useEffect, useState } from 'react'
import { listValueLog, type PropertyValueLogEntry } from '../propertyValueHistory/propertyValueHistoryQueries'
import { usePropertyTaxTrend } from './usePropertyTaxTrend'

export interface YearPoint {
  year: number
  value: number
}

export interface KpiTrendSeries {
  key: 'market_value' | 'rent_value' | 'property_tax'
  label: string
  points: YearPoint[]
}

// Market/rent value logs are dated (entry_date, not necessarily one per
// year) — bucketed here to "latest entry within each calendar year" so
// they share a per-year X axis with property tax (already yearly, per
// usePropertyTaxTrend). Voided entries excluded, same convention as
// every other consumer of this log (ValueTrendChart, KPI snapshot).
function bucketByYear(entries: PropertyValueLogEntry[]): YearPoint[] {
  const latestByYear = new Map<number, PropertyValueLogEntry>()
  for (const entry of entries) {
    if (entry.voided) continue
    const year = new Date(entry.entry_date).getFullYear()
    const existing = latestByYear.get(year)
    if (!existing || entry.entry_date > existing.entry_date) {
      latestByYear.set(year, entry)
    }
  }
  return [...latestByYear.entries()]
    .map(([year, entry]) => ({ year, value: Number(entry.value) }))
    .sort((a, b) => a.year - b.year)
}

// Roadmap 7.38 (2) — combines the 7.19 value history (market/rent) and
// the 7.24/7.37 property tax trend (usePropertyTaxTrend, reused as-is
// rather than re-querying property_tax_installments a second time) onto
// one shared per-year X axis for KpiTrendChart. No new table — every
// number here is already logged elsewhere on the Overview tab.
export function useKpiTrendChart(propertyId: string) {
  const [marketValuePoints, setMarketValuePoints] = useState<YearPoint[]>([])
  const [rentValuePoints, setRentValuePoints] = useState<YearPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { years: taxYears, loading: taxLoading, error: taxError } = usePropertyTaxTrend(propertyId)

  useEffect(() => {
    setLoading(true)
    Promise.all([listValueLog(propertyId, 'market_value'), listValueLog(propertyId, 'rent_value')]).then(
      ([marketRes, rentRes]) => {
        setLoading(false)
        const fetchError = marketRes.error?.message ?? rentRes.error?.message
        if (fetchError) {
          setError(fetchError)
          return
        }
        setError(null)
        setMarketValuePoints(bucketByYear(marketRes.data ?? []))
        setRentValuePoints(bucketByYear(rentRes.data ?? []))
      },
    )
  }, [propertyId])

  const series: KpiTrendSeries[] = [
    { key: 'market_value', label: 'Market value', points: marketValuePoints },
    { key: 'rent_value', label: 'Rent estimate', points: rentValuePoints },
    {
      key: 'property_tax',
      label: 'Property tax paid',
      points: taxYears.map((y) => ({ year: y.taxYear, value: y.total })),
    },
  ]

  return {
    series,
    loading: loading || taxLoading,
    error: error ?? taxError,
  }
}
