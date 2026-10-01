// NON-SAVING AGENTS WORKSPACE PREVIEW — shapes for fictional preview data
// only, not a schema. The field map in agentInputs.ts says which parts
// already exist in the dashboard and which would be new fields.
//
// Single source of truth: invoices, payments and receipts live in ONE
// account record store (the Rent ops records). The agent holds no ledger or
// document copies — its Workload and Approvals are filtered views of those
// same records, so an edit anywhere shows everywhere.

export type AgentStatus = 'training' | 'active' | 'paused'
export type AgentHealth = 'healthy' | 'attention' | 'blocked' | 'inactive'
export type AgentArea = 'Rent ops' | 'Financials' | 'Quick capture'

// Owner entity that issues invoices/receipts (existing `llcs` record). Each
// issuer has its own independent invoice and receipt sequences.
export interface IssuingEntity {
  id: string
  legalName: string
  // Short code used in numbers and filenames — a missing field today.
  shortCode: string | null
  nextInvoiceSeq: number
  nextReceiptSeq: number
}

// One tenant in the assistant's workload. Unit label follows the
// Identifiers rule: {property address} — {unit label}.
export interface TenantAssignment {
  id: string
  tenantId: string
  propertyId: string
  tenantName: string
  unitLabel: string
  leaseLabel: string
  monthlyRent: number | null
  billingEmail: string | null
  // Issuer for this tenant's documents: defaults to the property's single
  // owning entity; null when the property has several owners (never guessed).
  issuerEntityId: string | null
  ownerNote: string
  paused: boolean
}

export type DutyId = 'invoices' | 'payment_notices' | 'partial_payments' | 'receipts' | 'reminders' | 'delivery'

export interface AgentDuty {
  id: DutyId
  label: string
  description: string
  enabled: boolean
  availability: 'preview' | 'not_built'
  blockers: string[]
}

export interface AgentSchedule {
  enabled: false
  frequency: 'Monthly'
  draftDayOfMonth: number | null
  timeZone: string | null
}

export type CheckResult = 'pass' | 'fail' | 'not_run'

export interface AgentCheck {
  id: string
  label: string
  description: string
  results: { assignmentId: string | null; result: CheckResult; detail?: string }[]
}

export interface PracticeReview {
  reviewed: number
  approvedUnchanged: number
  corrected: number
  rejected: number
}

export type RunOutcome = 'completed' | 'completed_with_blocks' | 'failed'

export interface AgentRun {
  id: string
  startedAt: string
  kind: 'Practice' | 'Scheduled'
  outcome: RunOutcome
  draftsCreated: number
  blocked: number
  durationSeconds: number
  notes: string[]
}

// Lifecycle shared by invoices and receipts. 'superseded' = an issued
// revision replaced by a later issued revision; 'cancelled' = an issued
// document withdrawn. Both keep their number and PDF; neither number is
// ever reused.
export type DocState = 'draft' | 'approved' | 'issued' | 'superseded' | 'cancelled' | 'rejected'

export interface DeliveryEvent {
  at: string
  channel: string
  outcome: string
}

// An issued PDF. Never overwritten: a correction is a new revision with its
// own file, and each file keeps its own delivery history.
export interface IssuedDocument {
  revision: number
  filename: string
  issuedAt: string
  deliveries: DeliveryEvent[]
}

interface VersionedDoc {
  id: string
  issuerEntityId: string | null
  state: DocState
  // Assigned from the issuer's sequence at issue time only — drafts and
  // rejected drafts never consume a number.
  number: string | null
  revision: number
  revisionOf: string | null
  documents: IssuedDocument[]
  // Every edit bumps `version`; only material edits bump `materialVersion`.
  // Approval is valid only while approvedMaterialVersion === materialVersion.
  version: number
  materialVersion: number
  approvedMaterialVersion: number | null
  approvalNote: string | null
  createdBy: 'owner' | 'assistant'
  runId: string | null
  // Set when the record changed while the assistant was working on it; the
  // assistant's change was held, not applied over the newer edit.
  editConflict: string | null
  reviewBy: string | null
}

export interface InvoiceRecord extends VersionedDoc {
  kind: 'invoice'
  assignmentId: string
  periodLabel: string
  periodKey: string
  amountDue: number
  dueDate: string | null
  // Delivery-affecting fields — every one is MATERIAL: changing any of them
  // (or amount, due date, issuer, period) clears an existing approval.
  recipientName: string
  recipientEmail: string | null
  visibleNote: string
  attachmentIds: string[]
  // Strictly internal: never rendered on the PDF, email or any delivery.
  // The ONLY field whose edits keep an approval.
  internalNote: string
}

// A portion of one payment event applied to one invoice. A single payment
// can cover several invoices; each invoice can be paid by several payments.
export interface PaymentAllocation {
  invoiceId: string
  amount: number
}

export interface PaymentEvent {
  id: string
  assignmentId: string
  amount: number
  paidDate: string
  method: string | null
  evidenceNoticeIds: string[]
  allocations: PaymentAllocation[]
}

export interface ReceiptRecord extends VersionedDoc {
  kind: 'receipt'
  paymentId: string
}

export type ApprovalState = 'pending' | 'approved' | 'rejected'

export interface ReminderDraft {
  id: string
  invoiceId: string
  state: ApprovalState
  reviewBy: string | null
}

export type NoticeState = 'pending' | 'recorded' | 'linked' | 'dismissed'

// A payment notification — EVIDENCE only; never settles or reconciles.
export interface PaymentNotice {
  id: string
  assignmentId: string | null
  receivedAt: string
  sender: string
  summary: string
  amount: number
  reference: string | null
  state: NoticeState
  outcomePaymentId: string | null
}

// The account's one record store — what Rent ops, Workload and Approvals
// all read.
export interface RecordStore {
  entities: IssuingEntity[]
  invoices: InvoiceRecord[]
  payments: PaymentEvent[]
  receipts: ReceiptRecord[]
  reminders: ReminderDraft[]
  notices: PaymentNotice[]
}

export interface Agent {
  id: string
  name: string
  purpose: string
  area: AgentArea
  status: AgentStatus
  connection: 'not_built' | 'connected' | 'disconnected'
  // One run at a time per agent: set while a run holds the lock.
  activeRunId: string | null
  duties: AgentDuty[]
  assignments: TenantAssignment[]
  schedule: AgentSchedule
  checks: AgentCheck[]
  practiceReview: PracticeReview | null
  runs: AgentRun[]
  canDo: string[]
  cannotDo: string[]
}
