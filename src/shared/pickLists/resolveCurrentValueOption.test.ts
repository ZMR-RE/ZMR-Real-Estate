import { describe, expect, it } from 'vitest'
import { resolveCurrentValueOption } from './resolveCurrentValueOption'

// Regression coverage for the reported defect: a genuinely active pick-list
// value (e.g. loan_type "Conventional") was briefly labeled "(archived)"
// the instant a box's Edit mode opened, because usePickListOptions'
// activeOptions is empty for one render before its fetch resolves — these
// cases are exactly that race, plus the genuine-archival case it must not
// break.
describe('resolveCurrentValueOption', () => {
  it('renders nothing for a blank value', () => {
    expect(resolveCurrentValueOption('', [{ value: 'Conventional' }], false)).toBeNull()
  })

  it('renders nothing once the value is found among active options, loaded or not', () => {
    expect(resolveCurrentValueOption('Conventional', [{ value: 'Conventional' }], false)).toBeNull()
    expect(resolveCurrentValueOption('Conventional', [{ value: 'Conventional' }], true)).toBeNull()
  })

  it('never shows "(archived)" while options are still loading, even with an empty active list — the exact reported bug', () => {
    expect(resolveCurrentValueOption('Conventional', [], true)).toEqual({
      value: 'Conventional',
      label: 'Conventional',
    })
  })

  it('shows "(archived)" once loading has finished and the value is genuinely absent', () => {
    expect(resolveCurrentValueOption('Conventional', [{ value: 'FHA' }, { value: 'VA' }], false)).toEqual({
      value: 'Conventional',
      label: 'Conventional (archived)',
    })
  })

  it('upgrades from the plain label to "(archived)" once loading finishes and the value is confirmed absent', () => {
    const whileLoading = resolveCurrentValueOption('Conventional', [], true)
    const afterLoad = resolveCurrentValueOption('Conventional', [{ value: 'FHA' }], false)
    expect(whileLoading?.label).toBe('Conventional')
    expect(afterLoad?.label).toBe('Conventional (archived)')
  })
})
