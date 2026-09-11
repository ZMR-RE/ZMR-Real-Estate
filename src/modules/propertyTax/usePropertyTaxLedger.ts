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

export interface TaxInstallmentFiles {
  installment1File: File | null
  installment2File: File | null
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

    let installment1DocumentId = editingInstallment?.installment_1_document?.id ?? null
    let installment2DocumentId = editingInstallment?.installment_2_document?.id ?? null

    if (files.installment1File) {
      const { data, error: uploadError } = await uploadTaxInstallmentDocument(
        accountId,
        propertyId,
        session.user.id,
        files.installment1File,
      )
      if (uploadError || !data) {
        setSaving(false)
        setError(uploadError?.message ?? 'Could not upload the 1st installment document.')
        return
      }
      installment1DocumentId = data.id
    }

    if (files.installment2File) {
      const { data, error: uploadError } = await uploadTaxInstallmentDocument(
        accountId,
        propertyId,
        session.user.id,
        files.installment2File,
      )
      if (uploadError || !data) {
        setSaving(false)
        setError(uploadError?.message ?? 'Could not upload the 2nd installment document.')
        return
      }
      installment2DocumentId = data.id
    }

    const payload: PropertyTaxInstallmentInput = {
      tax_year: parsedYear,
      installment_1_amount: values.installment_1_amount || null,
      installment_1_paid_date: values.installment_1_paid_date || null,
      installment_1_document_id: installment1DocumentId,
      installment_2_amount: values.installment_2_amount || null,
      installment_2_paid_date: values.installment_2_paid_date || null,
      installment_2_document_id: installment2DocumentId,
    }

    const { error: saveError } = editingInstallment
      ? await updateTaxInstallment(editingInstallment.id, payload)
      : await createTaxInstallment(accountId, propertyId, payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

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
