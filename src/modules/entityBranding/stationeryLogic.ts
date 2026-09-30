import type { ColorRole, Stationery } from './stationeryTypes'

// Pure colour and layout helpers for entity stationery (mirrors the
// database rule in 20261001190000: text roles and labels on the accent band
// need 4.5:1 contrast).

export type Rgb = [number, number, number]

// Defaults = today's document colours (DESIGN-SYSTEM.md navy/greys), so an
// entity with no branding looks exactly like the current invoices.
export const DEFAULT_COLORS: Record<ColorRole, string> = {
  heading: '#123456',
  accent: '#5B6472',
  highlight: '#123456',
  secondary: '#5B6472',
}

export const ROLE_LABEL: Record<ColorRole, string> = {
  heading: 'Headings — entity name and document title',
  accent: 'Accent — table header band and dividers',
  highlight: 'Highlight — amount due / amount received',
  secondary: 'Secondary text — labels and small print',
}

const SHORT: Record<ColorRole, string> = {
  heading: 'Heading colour',
  accent: 'Accent colour',
  highlight: 'Highlight colour',
  secondary: 'Secondary text colour',
}

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance([r, g, b]: Rgb): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

// Mix a colour toward white: pct = 0 → colour, 1 → white.
export function tint(c: Rgb, pct: number): Rgb {
  return c.map((v) => Math.round(v + (255 - v) * pct)) as Rgb
}

const WHITE: Rgb = [255, 255, 255]
export const BAND_TINT = 0.88

export interface ResolvedColors {
  colors: Record<ColorRole, Rgb>
  warnings: string[]
}

// Unset or malformed roles fall back to the defaults. Text roles below WCAG
// AA (4.5:1 on white) are warned about — the proposal is to refuse saving
// them, so the preview shows what would be refused.
export function resolveColors(s: Stationery): ResolvedColors {
  const warnings: string[] = []
  const colors = {} as Record<ColorRole, Rgb>
  for (const role of Object.keys(DEFAULT_COLORS) as ColorRole[]) {
    const raw = s.colors[role]
    const parsed = raw ? parseHex(raw) : null
    if (raw && !parsed) warnings.push(`${SHORT[role]}: “${raw}” isn’t a colour like #1F4E79 — using the default.`)
    colors[role] = parsed ?? parseHex(DEFAULT_COLORS[role])!
  }
  for (const role of ['heading', 'highlight', 'secondary'] as ColorRole[]) {
    const ratio = contrastRatio(colors[role], WHITE)
    if (ratio < 4.5) warnings.push(`${SHORT[role]} is hard to read on white (${ratio}:1; needs 4.5:1).`)
  }
  const band = tint(colors.accent, BAND_TINT)
  const onBand = contrastRatio(colors.secondary, band)
  if (onBand < 4.5) warnings.push(`Table header labels are hard to read on the accent band (${onBand}:1; needs 4.5:1).`)
  return { colors, warnings }
}

export function fitLogo(width: number, height: number, maxW = 150, maxH = 48): { w: number; h: number } {
  const scale = Math.min(maxW / width, maxH / height, 1)
  return { w: Math.round(width * scale), h: Math.round(height * scale) }
}

export const EMPTY_STATIONERY: Stationery = {
  logo: null,
  colors: {},
  contact: { replyTo: '', phone: '', website: '' },
  paymentInstructions: '',
  defaults: { paperSize: 'letter', showLegalName: true, invoiceNote: '', documentFooter: '', receiptNote: '' },
}
