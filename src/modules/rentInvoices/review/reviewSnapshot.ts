import type { MockDb, MockRow } from '../../../devHarness/mockSupabase'

// SIMULATED BACKEND (review page only): JS mirror of the SQL
// invoice_print_snapshot (20261002120000) — everything an invoice prints,
// from the records as they are now. The SQL is the source of truth.

export function printSnapshot(db: MockDb, inv: MockRow): Record<string, unknown> {
  const find = (table: string, id: unknown) => db[table].find((r) => r.id === id)
  const e = find('llcs', inv.billing_entity_id)
  const b = db.entity_document_branding.find((x) => x.entity_id === inv.billing_entity_id) ?? {}
  const lv = find('entity_logo_versions', b.current_logo_id)
  const p = find('properties', inv.property_id)!
  const l = find('leases', inv.lease_id)
  const u = l ? find('units', l.unit_id) : undefined
  const override = String(p.payment_instructions_override ?? '').trim()
  const entityDefault = String(b.payment_instructions ?? '').trim()
  const paid = (id: unknown) => db.payments.filter((x) => x.invoice_id === id).reduce((s, x) => s + Number(x.amount), 0)
  return {
    issuer: e
      ? { entity_id: e.id, legal_name: e.name, display_name: e.display_name, invoice_code: e.invoice_code, mailing_address: e.mailing_address, mailing_city: e.mailing_city, mailing_state: e.mailing_state, mailing_zip: e.mailing_zip }
      : null,
    branding: {
      heading_color: b.heading_color ?? null,
      accent_color: b.accent_color ?? null,
      highlight_color: b.highlight_color ?? null,
      secondary_color: b.secondary_color ?? null,
      reply_to_email: b.reply_to_email ?? null,
      document_phone: b.document_phone ?? null,
      website: b.website ?? null,
      paper_size: b.paper_size ?? 'letter',
      show_legal_name: b.show_legal_name ?? true,
      document_footer: b.document_footer ?? null,
      logo: lv ? { id: lv.id, storage_path: lv.storage_path, sha256: lv.sha256, format: lv.format, width: lv.width, height: lv.height } : null,
    },
    payment_instructions: {
      text: override || entityDefault || null,
      source: override ? 'property' : entityDefault ? 'entity' : null,
    },
    recipients: inv.recipients,
    rental: { property_address: p.address, unit_label: u?.unit_label ?? null },
    period_start: inv.period_start,
    period_end: inv.period_end,
    due_date: inv.due_date,
    lines: db.invoice_lines
      .filter((x) => x.invoice_id === inv.id)
      .sort((a, c) => (a.sort_order as number) - (c.sort_order as number))
      .map((x) => ({ kind: x.line_kind, description: x.description, amount: x.amount })),
    amount_due: inv.amount_due,
    note: inv.visible_note ?? (String(b.default_invoice_note ?? '').trim() || null),
    revision: inv.revision,
    revision_of_number: inv.revision_of ? (find('invoices', inv.revision_of)?.number ?? null) : null,
    prior_unpaid: db.invoices
      .filter((o) => o.lease_id === inv.lease_id && o.state === 'issued' && o.number && o.id !== inv.id && o.id !== inv.revision_of && (o.period_start as string) < (inv.period_start as string))
      .map((o) => ({ number: o.number, period_start: o.period_start, outstanding: Number(o.amount_due) - paid(o.id) }))
      .filter((o) => o.outstanding > 0)
      .sort((a, c) => String(a.period_start).localeCompare(String(c.period_start))),
  }
}

// Which top-level parts differ (the SQL reports the same keys in ZM348).
export function changedKeys(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  return Object.keys({ ...a, ...b }).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
}
