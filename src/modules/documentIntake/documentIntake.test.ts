import { describe, expect, it } from 'vitest'
import { createDocumentIntake, emptyIntakeDetails } from './documentIntake'
import { localDocumentRepository } from '../../devHarness/documentIntake/localDocumentRepository'

const file = () => new File(['sample'], 'bill.pdf', { type: 'application/pdf' })
function setup() {
  return createDocumentIntake(localDocumentRepository({
    home: { accountId: 'a', units: ['unit-a'] },
    other: { accountId: 'b', units: ['unit-b'] },
  }))
}
describe('Document intake contract (local repository)', () => {
  it('accepts only a file with every detail absent', async () => {
    const service = setup()
    const row = await service.capture('a', 'request', file(), emptyIntakeDetails())
    expect(row.status).toBe('needs_review')
    expect(row.propertyId).toBeNull()
    expect(row.category).toBeNull()
    expect(Object.keys(row)).not.toContain('transactionId')
  })
  it('returns one record for simultaneous retries', async () => {
    const service = setup(), upload = file()
    const results = await Promise.all([1, 2, 3].map(() => service.capture('a', 'request', upload, emptyIntakeDetails())))
    expect(new Set(results.map(row => row.id)).size).toBe(1)
    expect(await service.list('a')).toHaveLength(1)
  })
  it('does not reuse a request for changed content', async () => {
    const service = setup()
    await service.capture('a', 'request', file(), emptyIntakeDetails())
    await expect(service.capture('a', 'request', file(), emptyIntakeDetails())).rejects.toThrow('changed')
  })
  it('files the original document and tolerates a lost-response retry', async () => {
    const service = setup()
    const row = await service.capture('a', 'request', file(), emptyIntakeDetails())
    const destination = { propertyId: 'home', unitId: null, category: 'Utilities' }
    const filed = await service.file('a', row, destination)
    expect(filed.documentId).toBe(row.documentId)
    expect(await service.file('a', row, destination)).toEqual(filed)
    expect(await service.list('a')).toHaveLength(1)
  })
  it('requires a destination only when filing', async () => {
    const service = setup()
    const row = await service.capture('a', 'request', file(), emptyIntakeDetails())
    expect(() => service.file('a', row, { propertyId: '', category: '', unitId: null })).toThrow('Choose a property')
  })
  it('isolates accounts and validates unit ownership', async () => {
    const service = setup()
    const row = await service.capture('a', 'request', file(), emptyIntakeDetails())
    expect(await service.list('b')).toEqual([])
    expect(() => service.file('b', row, { propertyId: 'other', category: 'Utilities', unitId: null })).toThrow('unavailable')
    await expect(service.file('a', row, { propertyId: 'other', category: 'Utilities', unitId: null })).rejects.toThrow('belonging')
    await expect(service.file('a', row, { propertyId: 'home', category: 'Utilities', unitId: 'unit-b' })).rejects.toThrow('belonging')
  })
  it('refuses stale or conflicting filing', async () => {
    const service = setup()
    const row = await service.capture('a', 'request', file(), emptyIntakeDetails())
    const destination = { propertyId: 'home', category: 'Utilities', unitId: null }
    await expect(service.file('a', { ...row, revision: 0 }, destination)).rejects.toThrow('changed')
    await service.file('a', row, destination)
    await expect(service.file('a', row, { ...destination, category: 'Other' })).rejects.toThrow('elsewhere')
  })
  it('preserves optional notes and rejects malformed dates or unsafe file types', async () => {
    const service = setup()
    const details = { ...emptyIntakeDetails(), notes: 'Tenant responsible; informational copy.' }
    expect((await service.capture('a', 'request', file(), details)).notes).toBe(details.notes)
    await expect(service.capture('a', 'date', file(), { ...details, documentDate: '2026-02-30' })).rejects.toThrow('valid document date')
    await expect(service.capture('a', 'html', new File(['x'], 'x.html', { type: 'text/html' }), details)).rejects.toThrow('Choose a PDF')
    await expect(service.capture('a', 'empty', new File([], 'x.pdf', { type: 'application/pdf' }), details)).rejects.toThrow('non-empty')
  })
})
