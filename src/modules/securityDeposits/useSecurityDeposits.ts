import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listProperties } from '../properties/propertiesQueries'
import {
  createDepositTransaction,
  createSecurityDeposit,
  getSecurityDepositsHeldAccount,
  listSecurityDeposits,
  voidDepositTransaction,
  type DepositTransaction,
  type SecurityDeposit,
} from './securityDepositsQueries'

export interface NewDepositInput {
  propertyId: string
  unit: string | null
  tenantName: string
  notes: string | null
  amount: number
  transactionDate: string
  description: string | null
}

export interface ReturnOrDamagesInput {
  securityDepositId: string
  transactionType: 'returned' | 'applied_to_damages'
  amount: number
  transactionDate: string
  description: string | null
}

export interface DepositBalance {
  received: number
  returned: number
  appliedToDamages: number
  remaining: number
}

function activeTransactions(transactions: DepositTransaction[]) {
  return transactions.filter((t) => !t.voided)
}

export function depositBalance(deposit: SecurityDeposit): DepositBalance {
  const active = activeTransactions(deposit.transactions)
  const received = active.filter((t) => t.transaction_type === 'received').reduce((sum, t) => sum + t.amount, 0)
  const returned = active.filter((t) => t.transaction_type === 'returned').reduce((sum, t) => sum + t.amount, 0)
  const appliedToDamages = active
    .filter((t) => t.transaction_type === 'applied_to_damages')
    .reduce((sum, t) => sum + t.amount, 0)

  return { received, returned, appliedToDamages, remaining: received - returned - appliedToDamages }
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

export function useSecurityDeposits() {
  const { accountId, session } = useAuth()
  const [deposits, setDeposits] = useState<SecurityDeposit[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false)
  const [transactionTargetId, setTransactionTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: p.name })))
    })
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listSecurityDeposits(accountId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setDeposits(data ?? [])
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startCreatingDeposit = () => setIsCreatingDeposit(true)
  const cancelCreatingDeposit = () => setIsCreatingDeposit(false)

  const saveNewDeposit = async (input: NewDepositInput) => {
    if (!accountId || !session) return
    setSaving(true)

    const { data: liabilityAccount, error: accountError } = await getSecurityDepositsHeldAccount(accountId)
    if (accountError || !liabilityAccount) {
      setSaving(false)
      setError('Could not find the Security Deposits Held liability account. Check Chart of Accounts.')
      return
    }
    if (liabilityAccount.type !== 'liability') {
      setSaving(false)
      setError(
        `"${liabilityAccount.name}" is no longer typed as a Liability account in Chart of Accounts — fix that before recording deposits.`,
      )
      return
    }

    const { data: deposit, error: depositError } = await createSecurityDeposit(accountId, {
      propertyId: input.propertyId,
      unit: input.unit,
      tenantName: input.tenantName,
      notes: input.notes,
    })
    if (depositError || !deposit) {
      setSaving(false)
      setError(depositError?.message ?? 'Could not create the security deposit record.')
      return
    }

    const { error: txError } = await createDepositTransaction(accountId, liabilityAccount.id, session.user.id, {
      securityDepositId: deposit.id,
      transactionType: 'received',
      amount: input.amount,
      transactionDate: input.transactionDate,
      description: input.description,
    })
    setSaving(false)
    if (txError) {
      setError(txError.message)
      return
    }

    setError(null)
    setIsCreatingDeposit(false)
    await refresh()
  }

  const startLoggingTransaction = (depositId: string) => setTransactionTargetId(depositId)
  const cancelLoggingTransaction = () => setTransactionTargetId(null)

  const saveReturnOrDamages = async (input: ReturnOrDamagesInput) => {
    if (!accountId || !session) return

    const deposit = deposits.find((d) => d.id === input.securityDepositId)
    if (!deposit) return
    const balance = depositBalance(deposit)
    if (input.amount > balance.remaining) {
      setError(
        `Amount ($${input.amount.toFixed(2)}) exceeds the remaining deposit balance ($${balance.remaining.toFixed(2)}).`,
      )
      return
    }

    setSaving(true)
    const { data: liabilityAccount, error: accountError } = await getSecurityDepositsHeldAccount(accountId)
    if (accountError || !liabilityAccount) {
      setSaving(false)
      setError('Could not find the Security Deposits Held liability account. Check Chart of Accounts.')
      return
    }

    const { error: txError } = await createDepositTransaction(accountId, liabilityAccount.id, session.user.id, input)
    setSaving(false)
    if (txError) {
      setError(txError.message)
      return
    }

    setError(null)
    setTransactionTargetId(null)
    await refresh()
  }

  const voidTransaction = async (id: string) => {
    setSaving(true)
    const { error: voidError } = await voidDepositTransaction(id)
    setSaving(false)
    if (voidError) {
      setError(voidError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
    deposits,
    propertyOptions,
    loading,
    error,
    saving,
    isCreatingDeposit,
    transactionTargetId,
    startCreatingDeposit,
    cancelCreatingDeposit,
    saveNewDeposit,
    startLoggingTransaction,
    cancelLoggingTransaction,
    saveReturnOrDamages,
    voidTransaction,
    todayDateString,
  }
}
