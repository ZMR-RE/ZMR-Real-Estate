import type { BrandingInput, BrandingRow } from './entityBrandingQueries'
import type { Stationery, StationeryLogo } from './stationeryTypes'

// Pure mapping between the stored row and the form/renderer shape.

export function stationeryFrom(row: BrandingRow | null, logo: StationeryLogo | null): Stationery {
  return {
    logo,
    colors: {
      heading: row?.heading_color ?? undefined,
      accent: row?.accent_color ?? undefined,
      highlight: row?.highlight_color ?? undefined,
      secondary: row?.secondary_color ?? undefined,
    },
    contact: { replyTo: row?.reply_to_email ?? '', phone: row?.document_phone ?? '', website: row?.website ?? '' },
    paymentInstructions: row?.payment_instructions ?? '',
    defaults: {
      paperSize: row?.paper_size ?? 'letter',
      showLegalName: row?.show_legal_name ?? true,
      invoiceNote: row?.default_invoice_note ?? '',
      documentFooter: row?.document_footer ?? '',
      receiptNote: row?.default_receipt_note ?? '',
    },
  }
}

const blank = (s: string) => (s.trim() === '' ? null : s.trim())
const hex = (s: string | undefined) => (s && s.trim() ? s.trim().toUpperCase() : null)

export function brandingInputFrom(s: Stationery, currentLogoId: string | null): BrandingInput {
  return {
    heading_color: hex(s.colors.heading),
    accent_color: hex(s.colors.accent),
    highlight_color: hex(s.colors.highlight),
    secondary_color: hex(s.colors.secondary),
    reply_to_email: blank(s.contact.replyTo),
    document_phone: blank(s.contact.phone),
    website: blank(s.contact.website),
    payment_instructions: blank(s.paymentInstructions),
    paper_size: s.defaults.paperSize,
    show_legal_name: s.defaults.showLegalName,
    default_invoice_note: blank(s.defaults.invoiceNote),
    default_receipt_note: blank(s.defaults.receiptNote),
    document_footer: blank(s.defaults.documentFooter),
    current_logo_id: s.logo ? currentLogoId : null,
  }
}

export function validateBrandingContact(s: Stationery): string[] {
  const e: string[] = []
  if (s.contact.replyTo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contact.replyTo.trim())) e.push('Reply-to email doesn’t look valid.')
  return e
}
