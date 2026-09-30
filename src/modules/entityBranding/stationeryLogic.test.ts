import { describe, expect, it } from 'vitest'
import { contrastRatio, DEFAULT_COLORS, EMPTY_STATIONERY, fitLogo, parseHex, resolveColors, tint } from './stationeryLogic'

describe('stationery colours', () => {
  it('parses hex colours', () => {
    expect(parseHex('#123456')).toEqual([18, 52, 86])
    expect(parseHex('123456')).toEqual([18, 52, 86])
    expect(parseHex('navy')).toBeNull()
  })

  it('computes WCAG contrast', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBe(21)
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBe(1)
  })

  it('defaults reproduce today’s documents with no warnings', () => {
    const r = resolveColors(EMPTY_STATIONERY)
    expect(r.warnings).toEqual([])
    expect(r.colors.heading).toEqual(parseHex(DEFAULT_COLORS.heading))
  })

  it('warns about unreadable text colours and bad values, falling back', () => {
    const r = resolveColors({ ...EMPTY_STATIONERY, colors: { heading: '#FFE066', highlight: 'teal' } })
    expect(r.warnings.some((w) => w.startsWith('Heading colour is hard to read'))).toBe(true)
    expect(r.warnings.some((w) => w.includes('“teal”'))).toBe(true)
    expect(r.colors.highlight).toEqual(parseHex(DEFAULT_COLORS.highlight))
  })

  it('tints toward white and fits logos inside the header box', () => {
    expect(tint([0, 0, 0], 1)).toEqual([255, 255, 255])
    expect(fitLogo(600, 200)).toEqual({ w: 144, h: 48 })
    expect(fitLogo(100, 20)).toEqual({ w: 100, h: 20 })
  })
})
