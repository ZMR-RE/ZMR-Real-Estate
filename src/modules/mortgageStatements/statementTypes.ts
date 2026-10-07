export interface StatementScope { accountId: string; propertyId: string; mortgageId: string }
export interface StatementDocument extends StatementScope {
  id: string
  originalFilename: string
  displayName: string
  digest: string
  statementDate: string | null
  source?: 'upload'|'existing'
  periodStart?: string | null
  periodEnd?: string | null
  documentKind?: StatementMetadata['documentKind']
  revision?: number
  uploadedAt: string
  // Uploading alone never asserts successful reconciliation.
  loanStatus: 'needs_review'
  booksStatus: 'not_reconciled'
}
export interface StatementUpload {
  requestId: string
  file: File
  digest: string
  originalFilename: string
  displayName: string
  statementDate: string | null
}
export interface StatementStore {
  list(scope: StatementScope): Promise<StatementDocument[]>
  // Adapter must enforce scope on the server. Same request/payload is idempotent;
  // digest collisions return the existing document, not a new copy.
  upload(scope: StatementScope, upload: StatementUpload): Promise<StatementDocument>
  open(scope: StatementScope, documentId: string): Promise<Blob>
}
export interface UploadRow {
  input: StatementUpload
  status: 'ready' | 'uploading' | 'failed' | 'saved'
  error?: string
  document?: StatementDocument
  existing?: boolean
}

export interface StatementMetadata {
 displayName: string; statementDate: string | null; periodStart: string | null; periodEnd: string | null
 documentKind: 'statement' | 'escrow_analysis' | 'tax_statement'; mortgageId: string
}
export interface LoanChoice { id:string; label:string }
export interface ExistingStatementFile { id:string; label:string; storagePath:string; mortgageId:string|null }
export interface StatementPreference { referenceId:string; mode:'full'|'forward'; revision:number }
export interface StatementOrganizationStore extends StatementStore {
 loans(scope:StatementScope):Promise<LoanChoice[]>
 existing(scope:StatementScope):Promise<ExistingStatementFile[]>
 link(scope:StatementScope,file:ExistingStatementFile):Promise<StatementDocument>
 update(scope:StatementScope,original:StatementDocument,input:StatementMetadata):Promise<StatementDocument>
 preference(scope:StatementScope):Promise<StatementPreference|null>
 savePreference(scope:StatementScope,input:StatementPreference):Promise<StatementPreference>
}
