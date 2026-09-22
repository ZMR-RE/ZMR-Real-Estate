import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getDocumentSignedUrl } from '../documents/documentsQueries'
import {
  createInsurancePolicy,
  listInsurancePolicies,
  updateInsurancePolicy,
  uploadInsurancePolicyDocument,
  type InsurancePolicy,
  type InsurancePolicyInput,
} from './insuranceQueries'

export interface InsurancePolicyFormValues {
  provider: string
  policy_number: string
  contact_info: string
  coverage_start_date: string
  coverage_end_date: string
  premium_amount: string
}

const BLANK_FORM_VALUES: InsurancePolicyFormValues = {
  provider: '',
  policy_number: '',
  contact_info: '',
  coverage_start_date: '',
  coverage_end_date: '',
  premium_amount: '',
}

function toFormValues(policy: InsurancePolicy): InsurancePolicyFormValues {
  return {
    provider: policy.provider,
    policy_number: policy.policy_number ?? '',
    contact_info: policy.contact_info ?? '',
    coverage_start_date: policy.coverage_start_date ?? '',
    coverage_end_date: policy.coverage_end_date ?? '',
    premium_amount: policy.premium_amount ?? '',
  }
}

// New build item — Insurance as a historical ledger, exact pattern of
// usePropertyTaxLedger.ts (9.5). Shown on the Property Profile's
// Overview tab, same as every other section there, until the 7.9 tab
// restructure lands.
export function useInsuranceLedger(propertyId: string) {
  const { accountId, session } = useAuth()

  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listInsurancePolicies(accountId, propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setPolicies(data ?? [])
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startAdding = () => {
    setError(null)
    setEditingId('new')
  }

  const startEditing = (id: string) => {
    setError(null)
    setEditingId(id)
  }

  const cancelEditing = () => {
    setError(null)
    setEditingId(null)
  }

  const editingPolicy = policies.find((p) => p.id === editingId) ?? null

  const formInitialValues = editingPolicy ? toFormValues(editingPolicy) : BLANK_FORM_VALUES

  const save = async (values: InsurancePolicyFormValues, files: File[]) => {
    if (!accountId || !session) return

    if (!values.provider.trim()) {
      setError('Enter a provider.')
      return
    }

    setSaving(true)

    const payload: InsurancePolicyInput = {
      provider: values.provider.trim(),
      policy_number: values.policy_number || null,
      contact_info: values.contact_info || null,
      coverage_start_date: values.coverage_start_date || null,
      coverage_end_date: values.coverage_end_date || null,
      premium_amount: values.premium_amount || null,
    }

    // Roadmap 9.5's pattern — the policy row itself carries no document
    // references, so it's saved first (documents attach afterward via
    // their own property_insurance_policy_id, which needs a real policy
    // id to point at — one a brand-new policy doesn't have until this
    // insert returns it).
    const { data: savedPolicy, error: saveError } = editingPolicy
      ? await updateInsurancePolicy(editingPolicy.id, payload)
      : await createInsurancePolicy(accountId, propertyId, payload)

    if (saveError || !savedPolicy) {
      setSaving(false)
      setError(saveError?.message ?? 'Could not save the insurance policy.')
      return
    }

    for (const file of files) {
      const { error: uploadError } = await uploadInsurancePolicyDocument(
        accountId,
        propertyId,
        savedPolicy.id,
        session.user.id,
        file,
      )
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
    }

    setSaving(false)
    setError(null)
    setEditingId(null)
    await refresh()
  }

  const viewDocument = async (path: string) => {
    const { data, error: urlError } = await getDocumentSignedUrl(path)
    if (urlError || !data) {
      setError(urlError?.message ?? 'Could not load document')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  return {
    policies,
    loading,
    error,
    editingId,
    editingPolicy,
    formInitialValues,
    saving,
    startAdding,
    startEditing,
    cancelEditing,
    save,
    viewDocument,
  }
}
