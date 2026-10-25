import type { Allocation, BalanceReference, ExistingPayment, LoanScope, SourceActivity, StatementBalance } from './reconciliationTypes'
export interface ReviewSource extends SourceActivity { description: string; page?: number }
export interface ReviewIssue { id: string; message: string; locked: boolean; category?: 'statement_details'; resolution?: string }
export interface LoanDataset {
  id: string; title: string; scope: LoanScope; reference: BalanceReference | null
  activity: ReviewSource[]; statements: StatementBalance[]; existing: ExistingPayment[]; issues: ReviewIssue[]
}
export interface SavedReview { sourceId: string; original: ReviewSource; allocation: Allocation; reason: string; reversalOf: string | null; action: string; existingId?: string; reviewer: string; reviewedAt: string; duplicateAck?: number }
export interface ReviewState {
  revision: number; reviews: Record<string, SavedReview>; issues: ReviewIssue[]
  completed: Record<string, { reviewer: string; at: string; note: string; stale?:boolean }>
  nextCycles: string[]
}
export interface ReviewWorkspace { dataset: LoanDataset; state: ReviewState; referenceVersions?: {principal:number;escrow:number} }
export type ReviewCommand =
 | { kind: 'review'; sourceId: string; allocation: Allocation; reason: string; reversalOf: string | null; confirmed: boolean; duplicateAck?: number }
 | { kind: 'remove'; sourceId: string }
 | { kind: 'issue'; id: string; resolution: string }
 | { kind: 'reopen'; documentId:string; note:string }
 | { kind: 'complete'; documentId: string; note: string; stale?:boolean }
export interface ReviewRequest { revision: number; referenceRevision: number | null; requestId: string; command: ReviewCommand }
