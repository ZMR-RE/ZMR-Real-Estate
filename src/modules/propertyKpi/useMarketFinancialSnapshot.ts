import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getMortgageDetails } from '../mortgagePayoff/mortgagePayoffQueries'
import { computeEquity, type EquitySnapshot } from '../mortgagePayoff/mortgagePayoffMath'
import { listCurrentTenantsForProperty } from '../tenants/propertyTenantsQueries'
import type { Transaction } from '../financials/financialsQueries'

export interface MarketFinancialSnapshot {
  marketValue: number | null
  currentBalance: number | null
  equity: EquitySnapshot | null
  annualRent: number | null
  ytdNetCashFlow: number
}

// Roadmap 7.13's KPI tab, Market & Financial Snapshot card. Only real,
// computable-from-stored-data figures are shown — per CLAUDE.md's data
// integrity rule, values this app can't honestly derive (cash-on-cash
// ROI needs a "cash invested" figure nothing here tracks; the Redfin/
// Zillow-value-as-of-date the roadmap item names isn't a field that
// exists) render as "not enough data yet" in the card rather than being
// guessed.
export function useMarketFinancialSnapshot(propertyId: string, marketValue: string | null, transactions: Transaction[]) {
  const { accountId } = useAuth()
  const [currentBalance, setCurrentBalance] = useState<number | null>(null)
  const [annualRent, setAnnualRent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)

    Promise.all([getMortgageDetails(propertyId), listCurrentTenantsForProperty(accountId, propertyId)]).then(
      ([mortgageRes, tenantsRes]) => {
        setLoading(false)
        const fetchError = mortgageRes.error?.message ?? tenantsRes.error?.message
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
      },
    )
  }, [accountId, propertyId])

  const marketValueNumber = marketValue !== null ? Number(marketValue) : null
  const equity =
    marketValueNumber !== null && currentBalance !== null ? computeEquity(marketValueNumber, currentBalance) : null

  const currentYear = new Date().getFullYear()
  const ytdNetCashFlow = transactions
    .filter((tx) => !tx.voided && new Date(tx.transaction_date).getFullYear() === currentYear)
    .reduce((sum, tx) => sum + (tx.entry_type === 'income' ? tx.amount : -tx.amount), 0)

  const snapshot: MarketFinancialSnapshot = {
    marketValue: marketValueNumber,
    currentBalance,
    equity,
    annualRent,
    ytdNetCashFlow,
  }

  return { snapshot, loading, error }
}
