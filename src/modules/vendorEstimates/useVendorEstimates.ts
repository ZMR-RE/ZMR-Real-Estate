import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useVendors } from '../vendors/useVendors'
import { listUnits } from '../units/unitsQueries'
import { listActionItems, type ActionItem } from '../actionQueue/actionItemsQueries'
import {
  chooseEstimate,
  createEstimateJob,
  createVendorEstimate,
  listEstimateJobs,
  type EstimateJob,
  type EstimateJobInput,
  type VendorEstimateInput,
} from './vendorEstimatesQueries'

// Roadmap 8.11(b) — property-scoped: one Vendor estimates box per
// Property Overview, same shape as useFinancialAccounts/useUnits.
export function useVendorEstimates(propertyId: string) {
  const { accountId } = useAuth()
  const { vendorOptions, addVendor } = useVendors(accountId)
  const [jobs, setJobs] = useState<EstimateJob[]>([])
  const [unitOptions, setUnitOptions] = useState<{ id: string; label: string }[]>([])
  const [actionItemOptions, setActionItemOptions] = useState<{ id: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isAddingJob, setIsAddingJob] = useState(false)
  // Which job (if any) currently has its "+ Log an estimate" form open.
  const [addingEstimateForJobId, setAddingEstimateForJobId] = useState<string | null>(null)
  // Which job (if any) currently has its "Choose winner" form open —
  // distinct from addingEstimateForJobId since a job's card can only
  // reasonably show one open sub-form at a time.
  const [choosingForJobId, setChoosingForJobId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listEstimateJobs(accountId, propertyId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setJobs(data ?? [])
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!accountId) return
    listUnits(accountId, propertyId).then(({ data }) => {
      setUnitOptions((data ?? []).filter((u) => !u.archived).map((u) => ({ id: u.id, label: u.unit_label })))
    })
    listActionItems(accountId, { propertyId }).then(({ data }: { data: ActionItem[] | null }) => {
      setActionItemOptions((data ?? []).map((a) => ({ id: a.id, label: a.title })))
    })
  }, [accountId, propertyId])

  const startAddingJob = () => setIsAddingJob(true)
  const cancelAddingJob = () => setIsAddingJob(false)

  const addJob = async (input: EstimateJobInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: createError } = await createEstimateJob(accountId, propertyId, input)
    setSaving(false)
    if (createError) {
      setError(createError.message)
      return
    }
    setError(null)
    setIsAddingJob(false)
    await refresh()
  }

  const startAddingEstimate = (jobId: string) => {
    setChoosingForJobId(null)
    setAddingEstimateForJobId(jobId)
  }
  const cancelAddingEstimate = () => setAddingEstimateForJobId(null)

  const addEstimate = async (jobId: string, input: VendorEstimateInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: createError } = await createVendorEstimate(accountId, jobId, input)
    setSaving(false)
    if (createError) {
      setError(createError.message)
      return
    }
    setError(null)
    setAddingEstimateForJobId(null)
    await refresh()
  }

  const startChoosing = (jobId: string) => {
    setAddingEstimateForJobId(null)
    setChoosingForJobId(jobId)
  }
  const cancelChoosing = () => setChoosingForJobId(null)

  const chooseWinner = async (jobId: string, estimateId: string, decisionNotes: string | null) => {
    setSaving(true)
    const { error: chooseError } = await chooseEstimate(jobId, estimateId, decisionNotes)
    setSaving(false)
    if (chooseError) {
      setError(chooseError.message)
      return
    }
    setError(null)
    setChoosingForJobId(null)
    await refresh()
  }

  return {
    jobs,
    loading,
    error,
    saving,
    vendorOptions,
    onCreateVendor: addVendor,
    unitOptions,
    actionItemOptions,
    isAddingJob,
    startAddingJob,
    cancelAddingJob,
    addJob,
    addingEstimateForJobId,
    startAddingEstimate,
    cancelAddingEstimate,
    addEstimate,
    choosingForJobId,
    startChoosing,
    cancelChoosing,
    chooseWinner,
  }
}
