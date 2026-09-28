import { describe, expect, it } from 'vitest'
import { clearPropertyCreationDraft, createEmptyDraft, loadPropertyCreationDraft, savePropertyCreationDraft } from './propertyCreationDraft'

function fakeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
}

describe('propertyCreationDraft', () => {
  it('returns null when nothing has been saved yet', () => {
    expect(loadPropertyCreationDraft(fakeStorage())).toBeNull()
  })

  it('round-trips a saved draft exactly', () => {
    const storage = fakeStorage()
    const draft = createEmptyDraft('11111111-1111-1111-1111-111111111111')
    draft.basics.address = '300 New Construction Ave'
    draft.stagedFiles.push({ fileKey: 'fk-1', name: 'invoice.pdf', size: 145000 })
    savePropertyCreationDraft(storage, draft)
    expect(loadPropertyCreationDraft(storage)).toEqual(draft)
  })

  it('resumes into the same idempotency key across a simulated reload (same storage instance)', () => {
    const storage = fakeStorage()
    const draft = createEmptyDraft('22222222-2222-2222-2222-222222222222')
    savePropertyCreationDraft(storage, draft)
    const resumed = loadPropertyCreationDraft(storage)
    expect(resumed?.idempotencyKey).toBe('22222222-2222-2222-2222-222222222222')
  })

  it('clears the draft so a later load sees nothing', () => {
    const storage = fakeStorage()
    savePropertyCreationDraft(storage, createEmptyDraft('33333333-3333-3333-3333-333333333333'))
    clearPropertyCreationDraft(storage)
    expect(loadPropertyCreationDraft(storage)).toBeNull()
  })

  it('treats corrupted stored JSON as no draft rather than throwing', () => {
    const storage = fakeStorage()
    storage.setItem('zmr:property-creation-draft', '{not valid json')
    expect(loadPropertyCreationDraft(storage)).toBeNull()
  })

  it('treats a value with no idempotencyKey as no draft', () => {
    const storage = fakeStorage()
    storage.setItem('zmr:property-creation-draft', JSON.stringify({ foo: 'bar' }))
    expect(loadPropertyCreationDraft(storage)).toBeNull()
  })
})
