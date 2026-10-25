import type { ReviewIssue } from './workflowTypes'

export function newestStatements<T extends { statementDate: string | null; displayName: string; id: string }>(documents: T[]): T[] {
 return [...documents].sort((a,b) => (b.statementDate ?? '').localeCompare(a.statementDate ?? '') || a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
}
export function attentionGroups(issues: ReviewIssue[]) {
 const groups = new Map<string, { key: string; label: string; issues: ReviewIssue[] }>()
 for (const issue of issues) {
  if (issue.resolution) continue
  const key = issue.category === 'statement_details' ? 'statement_details' : issue.message
  const group = groups.get(key) ?? {key, label: issue.category === 'statement_details' ? 'Statements need details checked' : issue.message, issues: []}
  group.issues.push(issue)
  groups.set(key, group)
 }
 return [...groups.values()]
}
