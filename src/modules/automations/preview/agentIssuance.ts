import { advanceSeq, formatDocNumber, issueBlocker, nextSeq, type SequenceKind } from './agentNumbering'
import type { RecordStore } from './agentTypes'

// THE single number allocator for every issuance path (assistant drafts,
// owner-created invoices, revisions, receipts). Protection is per entity ×
// document type, not per agent — one run per agent can't stop an owner
// issuing manually at the same moment.
//
// Two steps, mirroring the database function the built feature would use:
//   reserveNumber  — read the entity's next sequence (the "SELECT … FOR
//                    UPDATE" read), producing a reservation;
//   commitNumber   — apply it only if the sequence hasn't moved since the
//                    read and the number is unused anywhere (the unique
//                    index). A stale reservation is refused, never
//                    duplicated; the caller re-reserves.

export interface NumberReservation {
  entityId: string
  kind: SequenceKind
  seq: number
  number: string
}

export function numberInUse(store: RecordStore, number: string): boolean {
  return store.invoices.some((i) => i.number === number) || store.receipts.some((r) => r.number === number)
}

export function reserveNumber(store: RecordStore, entityId: string | null, kind: SequenceKind): NumberReservation | { error: string } {
  const entity = store.entities.find((e) => e.id === entityId)
  const blocker = issueBlocker(entity)
  if (blocker || !entity) return { error: blocker ?? 'Unknown issuer.' }
  const seq = nextSeq(entity, kind)
  return { entityId: entity.id, kind, seq, number: formatDocNumber(entity, kind, seq) }
}

// Returns the store with the sequence advanced, or null when the reservation
// is stale (another path issued first) or the number already exists.
export function commitNumber(store: RecordStore, r: NumberReservation): RecordStore | null {
  const entity = store.entities.find((e) => e.id === r.entityId)
  if (!entity || nextSeq(entity, r.kind) !== r.seq || numberInUse(store, r.number)) return null
  return { ...store, entities: advanceSeq(store.entities, r.entityId, r.kind) }
}
