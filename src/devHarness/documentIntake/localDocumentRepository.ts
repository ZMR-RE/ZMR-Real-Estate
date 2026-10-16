import type { DocumentIntakeRepository, IntakeRecord } from '../../modules/documentIntake/documentIntake'

/** Simulation only. Keeps bytes in memory, never contacts hosted storage. */
export function localDocumentRepository(properties: Record<string, { accountId: string; units: string[] }>): DocumentIntakeRepository {
  const records = new Map<string, IntakeRecord>()
  const attempts = new Map<string, { file: File; details: string; recordId: string }>()
  function destinationAllowed(accountId: string, propertyId: string, unitId: string | null) {
    const property = properties[propertyId]
    if (!property || property.accountId !== accountId || (unitId && !property.units.includes(unitId))) {
      throw new Error('Choose a property and unit belonging to this account.')
    }
  }
  return {
    async capture(accountId, requestId, file, details) {
      if (details.propertyId) destinationAllowed(accountId, details.propertyId, details.unitId)
      const key = `${accountId}:${requestId}`
      const prior = attempts.get(key)
      if (prior) {
        if (prior.file !== file || prior.details !== JSON.stringify(details)) throw new Error('This capture changed. Start a new capture.')
        return { ...records.get(prior.recordId)! }
      }
      const id = crypto.randomUUID()
      const record: IntakeRecord = { ...details, id, accountId, documentId: crypto.randomUUID(), filename: file.name, status: 'needs_review', revision: 1 }
      records.set(id, record)
      attempts.set(key, { file, details: JSON.stringify(details), recordId: id })
      return { ...record }
    },
    async list(accountId) {
      return [...records.values()].filter(row => row.accountId === accountId).map(row => ({ ...row }))
    },
    async file(accountId, id, revision, destination) {
      const current = records.get(id)
      if (!current || current.accountId !== accountId) throw new Error('Document unavailable in this account.')
      destinationAllowed(accountId, destination.propertyId, destination.unitId)
      if (current.status === 'filed') {
        if (current.propertyId === destination.propertyId && current.unitId === destination.unitId && current.category === destination.category) return { ...current }
        throw new Error('This document has already been filed elsewhere. Refresh before editing.')
      }
      if (current.revision !== revision) throw new Error('This document changed. Refresh before filing.')
      const next: IntakeRecord = { ...current, ...destination, status: 'filed', revision: current.revision + 1 }
      records.set(id, next)
      return { ...next }
    },
  }
}
