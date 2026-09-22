import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getDocumentSignedUrl } from '../documents/documentsQueries'
import {
  createTaxInstallment,
  listTaxInstallments,
  updateTaxInstallment,
  uploadTaxInstallmentDocument,
  type PropertyTaxInstallment,
  type PropertyTaxInstallmentInput,
} from './propertyTaxQueries'

export interface TaxInstallmentFormValues {
  tax_year: string
  installment_1_amount: string
  installment_1_paid_date: string
  installment_2_amount: string
  installment_2_paid_date: string
}

// Roadmap 9.5 revision — an array per slot (not a single File | null), so
// one save can add more than one new document to the same installment
// (e.g. the bill AND a payment confirmation at once, or added later on
// top of what's already attached).
export interface TaxInstallmentFiles {
  installment1Files: File[]
  installment2Files: File[]
}

const BLANK_FORM_VALUES: TaxInstallmentFormValues = {
  tax_year: new Date().getFullYear().toString(),
  installment_1_amount: '',
  installment_1_paid_date: '',
  installment_2_amount: '',
  installment_2_paid_date: '',
}

function toFormValues(installment: PropertyTaxInstallment): TaxInstallmentFormValues {
  return {
    tax_year: installment.tax_year.toString(),
    installment_1_amount: installment.installment_1_amount ?? '',
    installment_1_paid_date: installment.installment_1_paid_date ?? '',
    installment_2_amount: installment.installment_2_amount ?? '',
    installment_2_paid_date: installment.installment_2_paid_date ?? '',
  }
}

// Roadmap 9.5 — per-property property tax installment ledger, shown on the
// Property Profile's Overview tab until the 7.9 tab restructure lands.
export function usePropertyTaxLedger(propertyId: string) {
  const { accountId, session } = useAuth()

  const [installments, setInstallments] = useState<PropertyTaxInstallment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listTaxInstallments(accountId, propertyId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setError(null)
    setInstallments(data ?? [])
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

  const editingInstallment = installments.find((i) => i.id === editingId) ?? null

  const formInitialValues = editingInstallment ? toFormValues(editingInstallment) : BLANK_FORM_VALUES

  const save = async (values: TaxInstallmentFormValues, files: TaxInstallmentFiles) => {
    if (!accountId || !session) return

    const parsedYear = Number(values.tax_year)
    if (!values.tax_year || Number.isNaN(parsedYear)) {
      setError('Enter a valid tax year.')
      return
    }

    setSaving(true)

    const payload: PropertyTaxInstallmentInput = {
      tax_year: parsedYear,
      installment_1_amount: values.installment_1_amount || null,
      installment_1_paid_date: values.installment_1_paid_date || null,
      installment_2_amount: values.installment_2_amount || null,
      installment_2_paid_date: values.installment_2_paid_date || null,
    }

    // Roadmap 9.5 revision — the installment row itself carries no
    // document references anymore, so it's saved first (documents attach
    // afterward via their own property_tax_installment_id, which needs a
    // real installment id to point at — one a brand-new installment
    // doesn't have until this insert returns it).
    const { data: savedInstallment, error: saveError } = editingInstallment
      ? await updateTaxInstallment(editingInstallment.id, payload)
      : await createTaxInstallment(accountId, propertyId, payload)

    if (saveError || !savedInstallment) {
      setSaving(false)
      setError(saveError?.message ?? 'Could not save the tax installment.')
      return
    }

    for (const file of files.installment1Files) {
      const { error: uploadError } = await uploadTaxInstallmentDocument(
        accountId,
        propertyId,
        savedInstallment.id,
        savedInstallment.tax_year,
        1,
        session.user.id,
        file,
      )
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
    }

    for (const file of files.installment2Files) {
      const { error: uploadError } = await uploadTaxInstallmentDocument(
        accountId,
        propertyId,
        savedInstallment.id,
        savedInstallment.tax_year,
        2,
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
    installments,
    loading,
    error,
    editingId,
    editingInstallment,
    formInitialValues,
    saving,
    startAdding,
    startEditing,
    cancelEditing,
    save,
    viewDocument,
  }
}
