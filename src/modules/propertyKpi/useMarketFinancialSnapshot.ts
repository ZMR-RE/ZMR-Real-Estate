import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getMortgageDetails } from '../mortgagePayoff/mortgagePayoffQueries'
import { computeEquity, type EquitySnapshot } from '../mortgagePayoff/mortgagePayoffMath'
import { listCurrentTenantsForProperty } from '../tenants/propertyTenantsQueries'
import { listValueLog, type PropertyValueLogEntry } from '../propertyValueHistory/propertyValueHistoryQueries'
import type { Transaction } from '../financials/financialsQueries'

export interface MarketFinancialSnapshot {
  marketValue: PropertyValueLogEntry | null
  marketValueHistory: PropertyValueLogEntry[]
  rentValue: PropertyValueLogEntry | null
  rentValueHistory: PropertyValueLogEntry[]
  currentBalance: number | null
  equity: EquitySnapshot | null
  annualRent: number | null
  ytdNetCashFlow: number
}

// Roadmap 7.13's KPI tab, Market & Financial Snapshot card. Only real,
// computable-from-stored-data figures are shown — per CLAUDE.md's data
// integrity rule, values this app can't honestly derive (cash-on-cash
// ROI needs a "cash invested" figure nothing here tracks) render as "not
// enough data yet" in the card rather than being guessed.
//
// Roadmap 7.19 replaced the static properties.market_value field with a
// dated property_value_logs history — this hook now fetches that history
// itself (market_value and rent_value metrics) rather than receiving a
// single marketValue prop, same self-sufficient pattern this hook already
// used for mortgage details and current tenants. The as-of-date gap 7.13
// originally flagged ("Redfin/Zillow-value-as-of-date isn't a field that
// exists") is resolved by this history existing.
export function useMarketFinancialSnapshot(propertyId: string, transactions: Transaction[]) {
  const { accountId } = useAuth()
  const [currentBalance, setCurrentBalance] = useState<number | null>(null)
  const [annualRent, setAnnualRent] = useState<number | null>(null)
  const [marketValueHistory, setMarketValueHistory] = useState<PropertyValueLogEntry[]>([])
  const [rentValueHistory, setRentValueHistory] = useState<PropertyValueLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)

    Promise.all([
      getMortgageDetails(propertyId),
      listCurrentTenantsForProperty(accountId, propertyId),
      listValueLog(propertyId, 'market_value'),
      listValueLog(propertyId, 'rent_value'),
    ]).then(([mortgageRes, tenantsRes, marketValueRes, rentValueRes]) => {
      setLoading(false)
      const fetchError =
        mortgageRes.error?.message ??
        tenantsRes.error?.message ??
        marketValueRes.error?.message ??
        rentValueRes.error?.message
      if (fetchError) {
        setError(fetchError)
        return
      }
      setError(null)
      setCurrentBalance(mortgageRes.data ? Number(mortgageRes.data.current_balance) : null)

      const monthlyRent = (tenantsRes.data ?? []).reduce(
        (sum, row) => sum + (row.rent_amount !== null ? Number(row.rent_amount) : 0),
        0,
      )
      setAnnualRent(monthlyRent > 0 ? monthlyRent * 12 : null)

      setMarketValueHistory(marketValueRes.data ?? [])
      setRentValueHistory(rentValueRes.data ?? [])
    })
  }, [accountId, propertyId])

  // Both lists are ordered entry_date desc (including voided rows, marked
  // visibly rather than hidden) — the first non-voided row is the latest
  // real value.
  const latestMarketValue = marketValueHistory.find((entry) => !entry.voided) ?? null
  const latestRentValue = rentValueHistory.find((entry) => !entry.voided) ?? null

  const marketValueNumber = latestMarketValue ? Number(latestMarketValue.value) : null
  const equity =
    marketValueNumber !== null && currentBalance !== null ? computeEquity(marketValueNumber, currentBalance) : null

  const currentYear = new Date().getFullYear()
  const ytdNetCashFlow = transactions
    .filter((tx) => !tx.voided && new Date(tx.transaction_date).getFullYear() === currentYear)
    .reduce((sum, tx) => sum + (tx.entry_type === 'income' ? tx.amount : -tx.amount), 0)

  const snapshot: MarketFinancialSnapshot = {
    marketValue: latestMarketValue,
    marketValueHistory,
    rentValue: latestRentValue,
    rentValueHistory,
    currentBalance,
    equity,
    annualRent,
    ytdNetCashFlow,
  }

  return { snapshot, loading, error }
}
