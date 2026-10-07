import type { StatementDocument, StatementScope, UploadRow } from './statementTypes'
export const STATEMENT_PAGE_SIZE = 5
export function validStatementDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + 'T12:00:00Z')) &&
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value
}
export function suggestedStatementName(lender: string, suffix: string, date: string): string {
  if (!validStatementDate(date)) throw new Error('Enter the printed statement date.')
  const name = lender.trim() || 'Mortgage'
  const tail = suffix.trim().slice(-4)
  return `${name}${tail ? ` •${tail}` : ''} — Statement — ${date}.pdf`
}
export function sameScope(a: StatementScope, b: StatementScope): boolean {
  return a.accountId === b.accountId && a.propertyId === b.propertyId && a.mortgageId === b.mortgageId
}
export function assertScope(document: StatementDocument, scope: StatementScope): void {
  if (!sameScope(document, scope)) throw new Error('The document does not belong to this loan. Nothing was linked.')
}
export function statementPage(documents: StatementDocument[], page: number) {
  // Undated uploads are visible first so missing metadata cannot disappear.
  const sorted = [...documents].sort((a, b) => {
    if (!a.statementDate && b.statementDate) return -1
    if (a.statementDate && !b.statementDate) return 1
    return (b.statementDate ?? '').localeCompare(a.statementDate ?? '') ||
      b.uploadedAt.localeCompare(a.uploadedAt) || a.id.localeCompare(b.id)
  })
  const pages = Math.max(1, Math.ceil(sorted.length / STATEMENT_PAGE_SIZE))
  const current = Math.max(0, Math.min(Math.trunc(page) || 0, pages - 1))
  return { rows: sorted.slice(current * 5, current * 5 + 5), page: current, pages, count: sorted.length }
}
export async function prepareStatementFiles(files: File[], existing: UploadRow[]): Promise<UploadRow[]> {
  const seen = new Set(existing.map(row => row.input.digest))
  const added: UploadRow[] = []
  for (const file of files) {
    if (file.size === 0 || file.size > 25 * 1024 * 1024) throw new Error(`${file.name}: choose a PDF between 1 byte and 25 MB.`)
    const bytes = await file.arrayBuffer()
    const signature = new TextDecoder().decode(bytes.slice(0, 5))
    if (signature !== '%PDF-') throw new Error(`${file.name}: this file is not a PDF.`)
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('')
    if (seen.has(digest)) continue
    seen.add(digest)
    added.push({ status: 'ready', input: { requestId: crypto.randomUUID(), file, digest,
      originalFilename: file.name, displayName: file.name, statementDate: null } })
  }
  return added
}
