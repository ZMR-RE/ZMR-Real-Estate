import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getMortgageDetails } from '../mortgagePayoff/mortgagePayoffQueries'
import { computeEquity, type EquitySnapshot } from '../mortgagePayoff/mortgagePayoffMath'
import { sumActiveLeaseRentForProperty } from '../leases/leasesQueries'
import { listValueLog, type PropertyValueLogEntry } from '../propertyValueHistory/propertyValueHistoryQueries'
import type { Transaction } from '../financials/financialsQueries'

export interface MarketFinancialSnapshot {
  marketValue: PropertyValueLogEntry | null
  marketValueHistory: PropertyValueLogEntry[]
  rentValue: PropertyValueLogEntry | null
  rentValueHistory: PropertyValueLogEntry[]
  currentBalance: number | null
  // Roadmap 7.38 (4) — the mortgage payoff progress bar and the
  // KpiHeadline's equity-gained figure both need the loan's original
  // principal (fixed at origination, unlike current_balance) alongside
  // the balance already fetched here — same getMortgageDetails call,
  // just also keeping this field instead of only current_balance.
  originalLoanAmount: number | null
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
  const [originalLoanAmount, setOriginalLoanAmount] = useState<number | null>(null)
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
      sumActiveLeaseRentForProperty(accountId, propertyId),
      listValueLog(propertyId, 'market_value'),
      listValueLog(propertyId, 'rent_value'),
    ]).then(([mortgageRes, rentRes, marketValueRes, rentValueRes]) => {
      setLoading(false)
      const fetchError =
        mortgageRes.error?.message ??
        rentRes.error?.message ??
        marketValueRes.error?.message ??
        rentValueRes.error?.message
      if (fetchError) {
        setError(fetchError)
        return
      }
      setError(null)
      setCurrentBalance(mortgageRes.data ? Number(mortgageRes.data.current_balance) : null)
      setOriginalLoanAmount(mortgageRes.data ? Number(mortgageRes.data.original_loan_amount) : null)

      // Units/Lease/Tenant rebuild — sumActiveLeaseRentForProperty sums
      // one rent figure per lease (co-tenant-safe), not per tenant row;
      // this used to sum listCurrentTenantsForProperty's rows directly,
      // which double-counted rent for any unit with more than one
      // current tenant.
      setAnnualRent(rentRes.data !== null ? rentRes.data * 12 : null)

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
    originalLoanAmount,
    equity,
    annualRent,
    ytdNetCashFlow,
  }

  return { snapshot, loading, error }
}
