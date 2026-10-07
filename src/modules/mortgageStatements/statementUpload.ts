import { statementError } from './organizationLogic'
import type { StatementScope, StatementStore, UploadRow } from './statementTypes'
import { assertScope } from './statementLogic'
// Independent of rendering: the latch closes synchronously before any await.
export function createStatementUploader(store: StatementStore, scope: StatementScope) {
  let running = false
  return async (rows: UploadRow[], update: (id: string, changes: Partial<UploadRow>) => void) => {
    if (running) return false
    running = true
    try {
      for (const row of rows) {
        if (row.status === 'saved') continue
        update(row.input.requestId, { status: 'uploading', error: undefined })
        try {
          const document = await store.upload(scope, row.input)
          assertScope(document, scope)
          update(row.input.requestId, { status: 'saved', document, error: undefined })
        } catch (error) {
          update(row.input.requestId, { status: 'failed', error: statementError(error) })
        }
      }
      return true
    } finally { running = false }
  }
}
