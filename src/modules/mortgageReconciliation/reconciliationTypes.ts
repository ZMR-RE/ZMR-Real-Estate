export interface LoanScope { accountId: string; propertyId: string; mortgageId: string }
export type ActivityKind = 'payment' | 'principal' | 'reversal' | 'escrow_disbursement'
export interface Allocation { total: string; principal: string; interest: string; escrow: string; fees?: string }
export interface SourceActivity extends LoanScope, Allocation {
  sourceId: string; documentId: string; digest: string; line: number
  statementDate: string; postedDate: string; kind: ActivityKind
}
export interface ExistingPayment extends Omit<LoanScope, 'mortgageId'>, Allocation { mortgageId: string | null; id: string; postedDate: string; voided: boolean }
export interface StatementBalance extends LoanScope {
  documentId: string; date: string; principal: string; escrow: string
}
export interface BalanceReference { date: string; principal: string; escrow: string; revision: number }
export type Match = { status: 'missing' | 'matched' | 'conflict'; existingId?: string; message: string }
export interface DraftReview {
  sourceId: string; documentId: string; digest: string; line: number
  action: 'retain_existing' | 'historical_payment' | 'historical_adjustment'
  existingId?: string; referenceRevision: number
  source: SourceActivity; currentPrincipalEffect: '0.00'; currentEscrowEffect: '0.00'
}
