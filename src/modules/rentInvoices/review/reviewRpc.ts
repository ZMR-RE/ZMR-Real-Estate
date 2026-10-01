import type { MockDb, MockRow } from '../../../devHarness/mockSupabase'
import { changedKeys, printSnapshot } from './reviewSnapshot'

// SIMULATED BACKEND for the review page only: a JS mirror of the Stage 1
// invoice actions (supabase/migrations/20261002110000–20261002160000),
// kept close to the SQL. The SQL is the source of truth and is what the
// disposable-Postgres checks verify; this mirror only makes the real screen
// clickable without a database.

type Result = { data: unknown; error: { code: string; message: string } | null }
const ok = (data: unknown): Result => ({ data, error: null })
const fail = (code: string, message: string): Result => ({ data: null, error: { code, message } })
const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`
const round2 = (n: number) => Math.round(n * 100) / 100
const lastDay = (period: string) => new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate()
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function createReviewRpc(db: MockDb, now: () => string) {
  const find = (table: string, id: unknown) => db[table].find((r) => r.id === id)
  const log = (inv: MockRow, event: string, detail: Record<string, unknown> = {}) =>
    db.invoice_events.push({ id: newId('evt'), account_id: inv.account_id, invoice_id: inv.id, event, version: inv.version, at: now(), detail })
  const lines = (id: unknown) => db.invoice_lines.filter((l) => l.invoice_id === id).sort((a, b) => (a.sort_order as number) - (b.sort_order as number))

  const blockers = (leaseId: unknown, period: string): string[] => {
    const l = find('leases', leaseId)
    if (!l) return ['lease_not_found']
    const t = db.lease_billing_terms.find((x) => x.lease_id === l.id)
    const p = find('properties', l.property_id)!
    const end = `${period.slice(0, 8)}${lastDay(period)}`
    const b: string[] = []
    if (l.rent_amount == null) b.push('lease_rent')
    if (!t || t.due_day == null) b.push('due_day')
    if (!p.billing_entity_id) b.push('billing_entity')
    if (!db.lease_tenants.some((x) => x.lease_id === l.id && x.is_billing_recipient)) b.push('billing_recipient')
    const from = (t?.effective_from ?? l.start_date) as string
    const to = (t?.effective_to ?? l.end_date) as string | null
    if (l.archived || from > end || (to && to < period)) b.push('not_active_in_period')
    else if ((from > period || (to && to < end)) && t?.prorate_rule === 'manual') b.push('prorate_manual')
    if (db.invoices.some((i) => i.lease_id === l.id && i.period_start === period && !i.revision_of && !['rejected', 'cancelled'].includes(i.state as string))) b.push('already_invoiced')
    return b
  }

  const lock = (id: unknown, version: unknown, states: string[]): MockRow | Result => {
    const inv = find('invoices', id)
    if (!inv) return fail('ZM323', 'Invoice not found')
    if (inv.version !== version) return fail('ZM324', `This invoice changed since you opened it (now version ${inv.version}).`)
    if (!states.includes(inv.state as string)) return fail('ZM325', `This action isn't available for an invoice that is ${inv.state}`)
    return inv
  }
  const isResult = (x: MockRow | Result): x is Result => 'error' in x && 'data' in x && Object.keys(x).length === 2
  const recipientsOf = (leaseId: unknown) =>
    db.lease_tenants
      .filter((x) => x.lease_id === leaseId && x.is_billing_recipient)
      .map((x) => find('tenants', x.tenant_id)!)
      .sort((x, y) => String(x.name).localeCompare(String(y.name)))
      .map((tn) => ({ tenant_id: tn.id, name: tn.name, email: tn.email ?? null, phone: tn.phone ?? null }))

  // Mirror of invoicing_internal.create_draft_core: rent, recipients from
  // tenant profiles, billing-rule lines (fixed, unbilled statements,
  // one-time), amount due. The public action is always the owner's; the
  // review seed uses 'assistant' the way the assistant's run does.
  const createDraftCore = (leaseId: unknown, period: string, via: 'owner' | 'assistant', note: string | null, manual: number | null): Result => {
    let b = blockers(leaseId, period)
    if (manual != null) b = b.filter((x) => x !== 'prorate_manual')
    if (b.length) return fail('ZM320', `This tenancy can't be drafted yet: ${b.join(', ')}`)
    const l = find('leases', leaseId)!
    const t = db.lease_billing_terms.find((x) => x.lease_id === l.id)!
    const p = find('properties', l.property_id)!
    const days = lastDay(period)
    const end = `${period.slice(0, 8)}${days}`
    const from = [(t.effective_from ?? l.start_date) as string, period].sort().at(-1)!
    const to = [((t.effective_to ?? l.end_date) as string | null) ?? end, end].sort()[0]
    const active = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1
    let kind = 'rent'
    let amount = l.rent_amount as number
    let desc = `Rent — ${MONTH.format(new Date(`${period}T00:00:00Z`))}`
    const range = `${SHORT.format(new Date(`${from}T00:00:00Z`))}–${SHORT.format(new Date(`${to}T00:00:00Z`))}, ${period.slice(0, 4)}`
    if (active < days && manual != null) [kind, amount, desc] = ['prorated_rent', round2(Number(manual)), `Rent — ${range} (partial month)`]
    else if (active < days && t.prorate_rule === 'daily') [kind, amount, desc] = ['prorated_rent', round2(((l.rent_amount as number) * active) / days), `Rent — ${range} (${active} of ${days} days)`]
    const recips = db.lease_tenants.filter((x) => x.lease_id === l.id && x.is_billing_recipient).map((x) => find('tenants', x.tenant_id)!).sort((x, y) => String(x.name).localeCompare(String(y.name)))
    const names = recips.map((r) => r.name).join(' & ')
    const inv: MockRow = {
      id: newId('inv'), account_id: l.account_id, property_id: l.property_id, lease_id: l.id, billing_entity_id: p.billing_entity_id,
      state: 'draft', number: null, revision: 1, revision_of: null, version: 1, material_version: 1, approved_material_version: null,
      period_start: period, period_end: end, amount_due: amount, due_date: iso(Number(period.slice(0, 4)), Number(period.slice(5, 7)), Math.min(t.due_day as number, days)),
      billed_to: names, notes: null, recipient_name: names, recipients: recipientsOf(l.id), visible_note: note || null, internal_note: null,
      approved_snapshot: null, issued_snapshot: null, issued_at: null, created_via: via,
    }
    db.invoices.push(inv)
    let sort = 0
    const addLine = (line_kind: string, description: string, amt: number, rule_id: unknown = null, statement_id: unknown = null) =>
      db.invoice_lines.push({ id: newId('line'), invoice_id: inv.id, line_kind, description, amount: amt, sort_order: sort++, rule_id, statement_id })
    addLine(kind, desc, amount)
    const rules = db.tenancy_charge_rules.filter((r) => r.lease_id === l.id && r.status === 'active')
    rules.filter((r) => r.kind === 'fixed_recurring' && String(r.effective_from ?? period) <= end && String(r.effective_to ?? period) >= period).forEach((r) =>
      addLine('charge', `${r.description}${r.basis_total != null && r.share_percent != null ? ` (${Number(r.share_percent)}% of ${money(Number(r.basis_total))})` : ''}`, Number(r.amount), r.id))
    db.tenancy_charge_statements.filter((st) => rules.some((r) => r.id === st.rule_id) && !st.billed_invoice_id && String(st.service_period_start) <= period).forEach((st) => {
      const r = find('tenancy_charge_rules', st.rule_id)!
      addLine('charge', `${r.description} — ${Number(r.share_percent)}% of ${MONTH.format(new Date(`${st.service_period_start}T00:00:00Z`))} statement (${money(Number(st.statement_amount))})`, round2((Number(st.statement_amount) * Number(r.share_percent)) / 100), r.id, st.id)
      st.billed_invoice_id = inv.id
    })
    rules.filter((r) => r.kind === 'one_time' && r.one_time_period === period && !r.applied_invoice_id).forEach((r) => {
      addLine(Number(r.amount) < 0 ? 'credit' : 'charge', String(r.description), Number(r.amount), r.id)
      r.applied_invoice_id = inv.id
    })
    inv.amount_due = round2(lines(inv.id).reduce((sum, x) => sum + Number(x.amount), 0))
    log(inv, 'created', { via })
    return ok(inv.id)
  }
  const releaseRuleBilling = (invId: unknown) => {
    db.tenancy_charge_statements.forEach((st) => st.billed_invoice_id === invId && (st.billed_invoice_id = null))
    db.tenancy_charge_rules.forEach((r) => r.applied_invoice_id === invId && (r.applied_invoice_id = null))
  }

  const rpc = {
    invoice_print_snapshot: (a: Record<string, unknown>) => {
      const inv = find('invoices', a.p_id)
      return ok(inv ? printSnapshot(db, inv) : null)
    },
    get_invoice_draft_blockers: (a: Record<string, unknown>) => ok(blockers(a.p_lease_id, a.p_period_start as string)),

    create_invoice_draft: (a: Record<string, unknown>) => createDraftCore(a.p_lease_id, a.p_period_start as string, 'owner', null, a.p_manual_amount as number | null),

    update_invoice_draft: (a: Record<string, unknown>) => {
      const inv = lock(a.p_id, a.p_expected_version, ['draft', 'approved'])
      if (isResult(inv)) return inv
      const patch = a.p_patch as Record<string, unknown>
      const map: Record<string, string> = { due_date: 'due date', billing_entity_id: 'issuer', visible_note: 'note shown on the invoice' }
      const changed = Object.keys(map).filter((k) => k in patch && (patch[k] ?? null) !== (inv[k] ?? null)).map((k) => map[k])
      if ('lines' in patch) {
        const kept = lines(inv.id).filter((l) => l.rule_id)
        const manual = patch.lines as MockRow[]
        if (JSON.stringify(manual) !== JSON.stringify(lines(inv.id).filter((l) => !l.rule_id).map((l) => ({ line_kind: l.line_kind, description: l.description, amount: l.amount })))) changed.push('lines')
        db.invoice_lines = db.invoice_lines.filter((l) => l.invoice_id !== inv.id || l.rule_id)
        manual.forEach((l, i) => db.invoice_lines.push({ id: newId('line'), invoice_id: inv.id, ...l, sort_order: 100 + i, rule_id: null, statement_id: null }))
        inv.amount_due = round2([...kept, ...manual].reduce((sum, l) => sum + Number(l.amount), 0))
      }
      if (patch.refresh_recipients) {
        const fresh = recipientsOf(inv.lease_id)
        if (JSON.stringify(fresh) !== JSON.stringify(inv.recipients)) changed.push('recipients')
        inv.recipients = fresh
        inv.recipient_name = inv.billed_to = fresh.map((r) => r.name).join(' & ')
      }
      for (const k of [...Object.keys(map), 'internal_note']) if (k in patch) inv[k] = patch[k] ?? null
      inv.version = (inv.version as number) + 1
      if (changed.length) {
        inv.material_version = (inv.material_version as number) + 1
        if (inv.state === 'approved') {
          Object.assign(inv, { state: 'draft', approved_material_version: null, approved_snapshot: null })
          log(inv, 'approval_cleared', { changed })
        }
      }
      log(inv, 'edited', { changed })
      return ok(inv.version)
    },

    approve_invoice: (a: Record<string, unknown>) => {
      const inv = lock(a.p_id, a.p_expected_version, ['draft', 'approved'])
      if (isResult(inv)) return inv
      Object.assign(inv, { state: 'approved', approved_material_version: inv.material_version, approved_snapshot: printSnapshot(db, inv), version: (inv.version as number) + 1 })
      log(inv, 'approved')
      return ok(inv.version)
    },

    reject_invoice: (a: Record<string, unknown>) => {
      const inv = lock(a.p_id, a.p_expected_version, ['draft', 'approved'])
      if (isResult(inv)) return inv
      Object.assign(inv, { state: 'rejected', version: (inv.version as number) + 1 })
      if (!inv.revision_of) releaseRuleBilling(inv.id)
      log(inv, 'rejected', { reason: a.p_reason })
      return ok(inv.version)
    },

    issue_invoice: (a: Record<string, unknown>) => {
      const inv = lock(a.p_id, a.p_expected_version, ['approved'])
      if (isResult(inv)) return inv
      if (inv.approved_material_version !== inv.material_version) return fail('ZM331', 'The approval no longer matches this invoice; approve it again')
      const e = find('llcs', inv.billing_entity_id)
      if (!e) return fail('ZM332', 'Choose the issuing entity first')
      if (!e.invoice_code) return fail('ZM333', `${e.display_name ?? e.name} has no invoice code yet`)
      const diff = changedKeys(inv.approved_snapshot as Record<string, unknown>, printSnapshot(db, inv))
      if (diff.length) return fail('ZM348', `Something printed on this invoice changed since you approved it (${diff.join(', ')}). Review it and approve again.`)
      let number: string
      const orig = inv.revision_of ? find('invoices', inv.revision_of) : undefined
      if (orig) number = `${String(orig.number).replace(/-R\d+$/, '')}-R${inv.revision}`
      else {
        let seq = db.document_sequences.find((s) => s.entity_id === e.id && s.doc_type === 'invoice')
        if (!seq) db.document_sequences.push((seq = { entity_id: e.id, doc_type: 'invoice', next_value: 1 }))
        number = `${e.invoice_code}-INV-${String(seq.next_value).padStart(6, '0')}`
        seq.next_value = (seq.next_value as number) + 1
      }
      const issuedAt = now()
      Object.assign(inv, { state: 'issued', number, issued_at: issuedAt, version: (inv.version as number) + 1, issued_snapshot: { ...(inv.approved_snapshot as MockRow), number, issued_at: issuedAt } })
      log(inv, 'issued', { number })
      if (orig) {
        Object.assign(orig, { state: 'superseded', version: (orig.version as number) + 1 })
        log(orig, 'superseded', { by: number })
      }
      return ok(number)
    },

    revise_invoice: (a: Record<string, unknown>) => {
      const inv = lock(a.p_id, a.p_expected_version, ['issued'])
      if (isResult(inv)) return inv
      if (!inv.number) return fail('ZM335', 'Earlier unnumbered invoices can’t be revised here')
      if (db.payments.some((x) => x.invoice_id === inv.id))
        return fail('ZM349', `Payments are recorded against ${inv.number}. A revision would need those payments moved to it, which this release doesn't do — so this invoice can't be revised. Its PDF and payments stay as they are.`)
      if (db.invoices.some((i) => i.revision_of === inv.id && i.state !== 'rejected')) return fail('ZM336', 'A revision of this invoice already exists')
      const rev: MockRow = { ...inv, id: newId('inv'), state: 'draft', number: null, revision: (inv.revision as number) + 1, revision_of: inv.id, version: 1, material_version: 1, approved_material_version: null, approved_snapshot: null, issued_snapshot: null, issued_at: null, created_via: 'owner' }
      db.invoices.push(rev)
      lines(inv.id).forEach((l) => db.invoice_lines.push({ ...l, id: newId('line'), invoice_id: rev.id }))
      log(rev, 'created', { revision_of: inv.number })
      log(inv, 'revised', { revision_id: rev.id })
      return ok(rev.id)
    },

    cancel_invoice: (a: Record<string, unknown>) => {
      const inv = lock(a.p_id, a.p_expected_version, ['issued'])
      if (isResult(inv)) return inv
      if (!String(a.p_reason ?? '').trim()) return fail('ZM337', 'Give a reason for cancelling')
      if (db.payments.some((p) => p.invoice_id === inv.id)) return fail('ZM338', 'Payments are recorded against this invoice')
      Object.assign(inv, { state: 'cancelled', cancel_reason: a.p_reason, version: (inv.version as number) + 1 })
      releaseRuleBilling(inv.id)
      log(inv, 'cancelled', { reason: a.p_reason })
      return ok(inv.version)
    },

    attach_invoice_pdf: (a: Record<string, unknown>) => {
      const inv = find('invoices', a.p_invoice_id)
      if (!inv || !inv.number) return fail('ZM315', 'A PDF can only be attached to an issued, numbered invoice')
      if (db.documents.some((d) => d.invoice_id === inv.id)) return fail('23505', 'This invoice already has its stored PDF')
      const doc = { id: newId('doc'), invoice_id: inv.id, storage_path: a.p_storage_path, file_size: a.p_file_size }
      db.documents.push(doc)
      log(inv, 'pdf_attached', { storage_path: a.p_storage_path, file_size: a.p_file_size, sha256: a.p_sha256 })
      return ok(doc.id)
    },
  }
  return { rpc, createDraftCore }
}
