/** Document intake has no accounting payload or posting operation. */
export interface IntakeDetails {
  title: string
  propertyId: string | null
  unitId: string | null
  category: string | null
  documentDate: string | null
  notes: string
  vendorId?: string | null
  responsibility?: '' | 'unsure' | 'tenant' | 'owner' | 'shared'
  dueDate?: string | null
}

export interface IntakeRecord extends IntakeDetails {
  id: string
  accountId: string
  documentId: string | null
  filename: string
  status: 'uploading' | 'needs_review' | 'filed'
  revision: number
  requestId?: string
  capturedAt?: string
  propertyLabel?: string
  vendorLabel?: string
  unitLabel?: string
}

export interface FilingDestination {
  propertyId: string
  unitId: string | null
  category: string
}

export const emptyIntakeDetails = (): IntakeDetails => ({
  title: '', propertyId: null, unitId: null, category: null,
  documentDate: null, notes: '',
})

export function intakeDetailsOf(row: IntakeRecord): IntakeDetails {
 return {title:row.title,propertyId:row.propertyId,unitId:row.unitId,category:row.category,
  documentDate:row.documentDate,notes:row.notes,...(row.vendorId!==undefined?{vendorId:row.vendorId}:{}),
  ...(row.responsibility!==undefined?{responsibility:row.responsibility}:{}),...(row.dueDate!==undefined?{dueDate:row.dueDate}:{})}
}

export function validateIntake(file: Pick<File, 'name' | 'size' | 'type'>, details: IntakeDetails) {
  if (!file.name || file.size <= 0) throw new Error('Choose a non-empty file.')
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a file no larger than 25 MB.')
  if (file.name.length > 255 || details.title.length > 255 || details.notes.length > 10000) throw new Error('The filename, title or notes are too long.')
  // Explicit supported formats; no executable SVG/HTML previews.
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)) {
    throw new Error('Choose a PDF, JPEG, PNG, WebP or HEIC image.')
  }
  if (details.unitId && !details.propertyId) throw new Error('Choose the property for this unit.')
  for (const date of [details.documentDate, details.dueDate]) {
   if (date) {
    const parsed = new Date(`${date}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new Error('Enter a valid document date.')
    }
   }
  }
}

/** Hosted implementations must enforce these operations atomically on the server.
 * The key belongs to one capture attempt and survives retries after a lost response.
 * Filing references the original document; it must not copy the file.
 */
export interface DocumentIntakeRepository {
  capture(accountId: string, requestId: string, file: File, details: IntakeDetails): Promise<IntakeRecord>
  list(accountId: string): Promise<IntakeRecord[]>
  file(accountId: string, id: string, revision: number, destination: FilingDestination): Promise<IntakeRecord>
}

export function createDocumentIntake(repository: DocumentIntakeRepository) {
  return {
    async capture(accountId: string, requestId: string, file: File, details: IntakeDetails) {
      if (!accountId || !requestId) throw new Error('Your account and capture session are required.')
      validateIntake(file, details)
      return repository.capture(accountId, requestId, file, details)
    },
    list(accountId: string) {
      if (!accountId) throw new Error('Sign in to view captured documents.')
      return repository.list(accountId)
    },
    file(accountId: string, record: IntakeRecord, destination: FilingDestination) {
      if (!accountId || record.accountId !== accountId) throw new Error('Document unavailable in this account.')
      if (!destination.propertyId || !destination.category.trim()) throw new Error('Choose a property and document category before filing.')
      return repository.file(accountId, record.id, record.revision, destination)
    },
  }
}
