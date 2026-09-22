import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createFinancialAccount,
  isValidLastFour,
  listFinancialAccounts,
  setFinancialAccountArchived,
  updateFinancialAccount,
  type FinancialAccount,
  type FinancialAccountInput,
} from './financialAccountsQueries'

export function useFinancialAccounts(propertyId: string) {
  const { accountId } = useAuth()
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Roadmap 7.23 — archived accounts hidden by default, behind a "Show
  // archived" toggle in the section header. UI-only filter, not a
  // refetch: `accounts` always holds everything (an archived one must
  // still resolve for historical Quick Capture/Financials rows that
  // reference it), this just decides what the list renders.
  const [showArchived, setShowArchived] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listFinancialAccounts(accountId, propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setAccounts(data ?? [])
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startAdding = () => {
    setError(null)
    setEditingId(null)
    setIsAdding(true)
  }

  const startEditing = (id: string) => {
    setError(null)
    setIsAdding(false)
    setEditingId(id)
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setError(null)
  }

  const validate = (input: FinancialAccountInput): string | null => {
    if (!isValidLastFour(input.last_four)) {
      return 'Last 4 digits must be exactly 4 numbers — never a full account or card number.'
    }
    return null
  }

  const add = async (input: FinancialAccountInput) => {
    if (!accountId) return
    const validationError = validate(input)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    const { error: saveError } = await createFinancialAccount(accountId, propertyId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await refresh()
  }

  const save = async (id: string, input: FinancialAccountInput) => {
    const validationError = validate(input)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    const { error: saveError } = await updateFinancialAccount(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const toggleArchived = async (financialAccount: FinancialAccount) => {
    setSaving(true)
    const { error: saveError } = await setFinancialAccountArchived(financialAccount.id, !financialAccount.archived)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  return {
    accounts: showArchived ? accounts : accounts.filter((a) => !a.archived),
    archivedCount: accounts.filter((a) => a.archived).length,
    showArchived,
    setShowArchived,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    toggleArchived,
  }
}
