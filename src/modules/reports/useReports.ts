import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties, type Property } from '../properties/propertiesQueries'
import { listTransactions } from '../financials/financialsQueries'
import { listChartOfAccounts, listCategoryMappings } from '../chartOfAccounts/chartOfAccountsQueries'
import { listPortfolioMortgages } from '../mortgagePayoff/mortgagePayoffQueries'
import { listMortgagePaymentsForAccount } from './reportsQueries'
import {
  computeBalanceSheet,
  computeCashFlow,
  computeProfitAndLoss,
  type BalanceSheet,
  type CashFlow,
  type ProfitAndLoss,
} from './reportsCalculations'

export type ReportTab = 'balance-sheet' | 'profit-loss' | 'cash-flow'

export const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

export function useReports() {
  const { accountId } = useAuth()
  const [tab, setTab] = useState<ReportTab>('balance-sheet')
  const [year, setYear] = useState(new Date().getFullYear())
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)

  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null)
  const [profitAndLoss, setProfitAndLoss] = useState<ProfitAndLoss | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => setProperties(data ?? []))
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)

    const [
      { data: chartOfAccounts, error: chartError },
      { data: categoryMappings, error: mappingsError },
      { data: portfolioMortgages, error: mortgagesError },
      { data: yearTransactions, error: yearTxError },
      { data: yearPrincipalPayments, error: yearPrincipalError },
      { data: allTimeTransactions, error: allTimeTxError },
      { data: allTimePrincipalPayments, error: allTimePrincipalError },
    ] = await Promise.all([
      listChartOfAccounts(accountId),
      listCategoryMappings(accountId),
      listPortfolioMortgages(accountId),
      listTransactions(accountId, { propertyId: propertyFilter, year }),
      listMortgagePaymentsForAccount(accountId, { year }),
      listTransactions(accountId, { propertyId: propertyFilter }),
      listMortgagePaymentsForAccount(accountId),
    ])
    setLoading(false)

    const fetchError =
      chartError?.message ??
      mappingsError?.message ??
      mortgagesError?.message ??
      yearTxError?.message ??
      yearPrincipalError?.message ??
      allTimeTxError?.message ??
      allTimePrincipalError?.message
    if (fetchError) {
      setError(fetchError)
      return
    }
    setError(null)

    const pnl = computeProfitAndLoss(yearTransactions ?? [], chartOfAccounts ?? [], categoryMappings ?? [])
    setProfitAndLoss(pnl)

    const principalPaidThisYear = (yearPrincipalPayments ?? [])
      .filter((payment) => !propertyFilter || payment.property_id === propertyFilter)
      .reduce((sum, payment) => sum + Number(payment.principal_amount), 0)
    setCashFlow(computeCashFlow(pnl, principalPaidThisYear))

    const scopedProperties = propertyFilter ? properties.filter((p) => p.id === propertyFilter) : properties
    setBalanceSheet(
      computeBalanceSheet(
        scopedProperties,
        allTimeTransactions ?? [],
        allTimePrincipalPayments ?? [],
        portfolioMortgages ?? [],
      ),
    )
  }, [accountId, propertyFilter, year, properties])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    tab,
    setTab,
    year,
    setYear,
    propertyFilter,
    setPropertyFilter,
    propertyOptions: properties.map((p) => ({ id: p.id, label: propertyLabel(p) })),
    loading,
    error,
    balanceSheet,
    profitAndLoss,
    cashFlow,
  }
}
