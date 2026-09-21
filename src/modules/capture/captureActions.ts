import { hasAtMostTwoDecimalPlaces } from '../../shared/currencyInput'
import { upsertMileageTrip } from './mileageTripsQueries'
import {
  addCaptureAttachments,
  updateCaptureEntryDetails,
  uploadAttachment,
  MAX_ATTACHMENTS_PER_ENTRY,
  type AttachmentType,
  type CaptureEntry,
} from './captureQueries'

function attachmentTypeFor(file: File): AttachmentType | null {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf') return 'pdf'
  return null
}

export interface SaveCaptureEntryDetailsInput {
  notes: string
  milesDriven: string
  startDestination: string
  endDestination: string
  unitId: string
  amount: string
  category: string
  financialAccountId: string
  paymentMethod: string
  repairOrImprovement: string
  entryDirection: string
  paidToVendorId: string
  paidToTenantId: string
  paidToProspectiveTenantId: string
  metWith: string
  metWithVendorId: string
  metWithTenantId: string
  metWithProspectiveTenantId: string
  visitType: string
  contactName: string
  contactMethod: string
  subject: string
  newFiles: File[]
}

// Roadmap 1.10/1.11 — "any remaining-field completion happens in
// Recently logged/Reconciliation": this is that shared orchestration
// (upload any newly-added files, insert their capture_attachments rows,
// update notes/miles_driven), called identically from both surfaces
// rather than each re-implementing it.
export async function saveCaptureEntryDetails(
  accountId: string,
  entry: CaptureEntry,
  input: SaveCaptureEntryDetailsInput,
): Promise<{ error: string | null }> {
  if (entry.attachments.length + input.newFiles.length > MAX_ATTACHMENTS_PER_ENTRY) {
    return { error: `Up to ${MAX_ATTACHMENTS_PER_ENTRY} attachments per entry.` }
  }

  const invalidFile = input.newFiles.find((f) => !attachmentTypeFor(f))
  if (invalidFile) {
    return { error: 'Attachments must be photos or PDFs.' }
  }

  const parsedMiles = input.milesDriven.trim() ? Number(input.milesDriven) : null
  if (input.milesDriven.trim() && (Number.isNaN(parsedMiles) || (parsedMiles as number) < 0)) {
    return { error: 'Miles driven must be a positive number.' }
  }

  const parsedAmount = input.amount.trim() ? Number(input.amount) : null
  if (input.amount.trim() && (Number.isNaN(parsedAmount) || (parsedAmount as number) <= 0)) {
    return { error: 'Amount must be a positive number.' }
  }
  if (input.amount.trim() && !hasAtMostTwoDecimalPlaces(input.amount)) {
    return { error: 'Amount can have at most 2 decimal places.' }
  }

  if (input.newFiles.length > 0) {
    const uploaded: { path: string; type: AttachmentType }[] = []
    for (const file of input.newFiles) {
      const { path, error: uploadError } = await uploadAttachment(accountId, file)
      if (uploadError) {
        return { error: uploadError.message }
      }
      uploaded.push({ path, type: attachmentTypeFor(file)! })
    }
    const { error: attachError } = await addCaptureAttachments(accountId, entry.id, uploaded)
    if (attachError) {
      return { error: attachError.message }
    }
  }

  const { error: updateError } = await updateCaptureEntryDetails(entry.id, {
    notes: input.notes.trim() || null,
    milesDriven: parsedMiles,
    startDestination: input.startDestination.trim() || null,
    endDestination: input.endDestination.trim() || null,
    unitId: input.unitId || null,
    amount: parsedAmount,
    category: input.category || null,
    financialAccountId: input.financialAccountId || null,
    paymentMethod: input.paymentMethod || null,
    repairOrImprovement: input.repairOrImprovement || null,
    entryDirection: input.entryDirection || null,
    paidToVendorId: input.paidToVendorId || null,
    paidToTenantId: input.paidToTenantId || null,
    paidToProspectiveTenantId: input.paidToProspectiveTenantId || null,
    metWith: input.metWith.trim() || null,
    metWithVendorId: input.metWithVendorId || null,
    metWithTenantId: input.metWithTenantId || null,
    metWithProspectiveTenantId: input.metWithProspectiveTenantId || null,
    visitType: input.visitType || null,
    contactName: input.contactName.trim() || null,
    contactMethod: input.contactMethod || null,
    subject: input.subject.trim() || null,
  })
  if (updateError) {
    return { error: updateError.message }
  }

  // Roadmap 1.21 — a route filled in later (not just at capture time)
  // still becomes a reusable trip once it has a start, end, and miles.
  if (
    entry.entry_type === 'mileage' &&
    input.startDestination.trim() &&
    input.endDestination.trim() &&
    parsedMiles !== null &&
    parsedMiles > 0
  ) {
    await upsertMileageTrip(
      accountId,
      entry.property.id,
      input.startDestination.trim(),
      input.endDestination.trim(),
      parsedMiles,
    )
  }

  return { error: null }
}
