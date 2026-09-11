import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { CATEGORY_LABELS, type Category } from '../financials/financialsQueries'
import {
  createChartAccount,
  listCategoryMappings,
  listChartOfAccounts,
  updateCategoryMapping,
  updateChartAccount,
  type ChartAccount,
  type ChartAccountInput,
  type CategoryMapping,
} from './chartOfAccountsQueries'

const BLANK_ACCOUNT: ChartAccountInput = {
  type: 'expense',
  name: '',
  description: null,
}

function toInput(account: ChartAccount): ChartAccountInput {
  return { type: account.type, name: account.name, description: account.description }
}

export function useChartOfAccounts() {
  const { accountId } = useAuth()
  const [accounts, setAccounts] = useState<ChartAccount[]>([])
  const [mappings, setMappings] = useState<CategoryMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)

  // category id -> chart_account_id the user has picked but not yet saved
  const [pendingMappingEdits, setPendingMappingEdits] = useState<Record<string, string>>({})
  const [savingMappingId, setSavingMappingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [{ data: accountsData, error: accountsError }, { data: mappingsData, error: mappingsError }] =
      await Promise.all([listChartOfAccounts(accountId), listCategoryMappings(accountId)])
    setLoading(false)

    if (accountsError) {
      setError(accountsError.message)
      return
    }
    if (mappingsError) {
      setError(mappingsError.message)
      return
    }

    setError(null)
    setAccounts(accountsData ?? [])
    setMappings(mappingsData ?? [])
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const editingAccount = accounts.find((a) => a.id === editingAccountId) ?? null

  const startAddingAccount = () => {
    setEditingAccountId(null)
    setIsAddingAccount(true)
  }

  const startEditingAccount = (id: string) => {
    setIsAddingAccount(false)
    setEditingAccountId(id)
  }

  const cancelAccountForm = () => {
    setIsAddingAccount(false)
    setEditingAccountId(null)
  }

  const saveAccount = async (input: ChartAccountInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = editingAccount
      ? await updateChartAccount(editingAccount.id, input)
      : await createChartAccount(accountId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setError(null)
    setIsAddingAccount(false)
    setEditingAccountId(null)
    await refresh()
  }

  const setPendingMapping = (mappingId: string, chartAccountId: string) => {
    setPendingMappingEdits((prev) => ({ ...prev, [mappingId]: chartAccountId }))
  }

  const cancelMappingEdit = (mappingId: string) => {
    setPendingMappingEdits((prev) => {
      const next = { ...prev }
      delete next[mappingId]
      return next
    })
  }

  const saveMappingEdit = async (mappingId: string) => {
    const chartAccountId = pendingMappingEdits[mappingId]
    if (!chartAccountId) return
    setSavingMappingId(mappingId)
    const { error: saveError } = await updateCategoryMapping(mappingId, chartAccountId)
    setSavingMappingId(null)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setError(null)
    cancelMappingEdit(mappingId)
    await refresh()
  }

  const mappingRows = mappings
    .map((mapping) => ({
      mapping,
      categoryLabel: CATEGORY_LABELS[mapping.category as Category] ?? mapping.category,
      pendingChartAccountId: pendingMappingEdits[mapping.id] ?? null,
    }))
    .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel))

  return {
    accounts,
    mappingRows,
    loading,
    error,
    saving,
    isAddingAccount,
    editingAccountId,
    formInitialValues: editingAccount ? toInput(editingAccount) : BLANK_ACCOUNT,
    isAccountFormOpen: isAddingAccount || editingAccountId !== null,
    startAddingAccount,
    startEditingAccount,
    cancelAccountForm,
    saveAccount,
    savingMappingId,
    setPendingMapping,
    cancelMappingEdit,
    saveMappingEdit,
  }
}
