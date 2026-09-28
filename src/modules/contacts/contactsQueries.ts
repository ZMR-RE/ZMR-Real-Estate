import { supabase } from '../../shared/supabaseClient'

// O1-A ownership foundation (Batch G2) — reusable people/organizations
// with multiple labeled phone/email methods, explicitly attached to a
// property and/or entity with a role each time. New module: no existing
// module owned this concept (vendors/tenants each have a single flat
// contact_email/contact_phone, not multiple methods per record — see
// 20260925030000_contacts.sql's own comment for the precedent search).
// Every Supabase call for contacts/contact_methods/contact_links lives
// here per CLAUDE.md's module-shape rule.

export interface Contact {
  id: string
  account_id: string
  name: string
  notes: string | null
  archived: boolean
}

export type ContactInput = Pick<Contact, 'name' | 'notes'>

export interface ContactMethod {
  id: string
  contact_id: string
  method_type: 'phone' | 'email'
  value: string
  label: string | null
  is_preferred: boolean
}

export type ContactMethodInput = Omit<ContactMethod, 'id' | 'contact_id'>

export interface ContactLinkScope {
  propertyId?: string | null
  llcId?: string | null
}

export interface ContactWithMethods extends Contact {
  methods: ContactMethod[]
}

// A single contact_links row plus its full contact record and methods —
// what the entity/property Contacts panels actually render one card per.
export interface LinkedContact {
  link_id: string
  role: string | null
  is_primary_contact: boolean
  contact: ContactWithMethods
}

const CONTACT_COLUMNS = 'id, account_id, name, notes, archived'
const METHOD_COLUMNS = 'id, contact_id, method_type, value, label, is_preferred'

// For the "search existing contacts, or add a new one" picker — every
// active contact in the account, name only (methods are fetched only once
// a contact is actually opened/linked, not for every row in a picker
// list).
export async function listContacts(accountId: string) {
  return supabase
    .from('contacts')
    .select(CONTACT_COLUMNS)
    .eq('account_id', accountId)
    .eq('archived', false)
    .order('name')
    .returns<Contact[]>()
}

export async function createContact(accountId: string, input: ContactInput) {
  return supabase.from('contacts').insert({ ...input, account_id: accountId }).select(CONTACT_COLUMNS).returns<Contact[]>().single()
}

export async function updateContact(id: string, input: ContactInput) {
  return supabase.from('contacts').update(input).eq('id', id).select(CONTACT_COLUMNS).returns<Contact[]>().single()
}

export async function addContactMethod(accountId: string, contactId: string, input: ContactMethodInput) {
  return supabase
    .from('contact_methods')
    .insert({ ...input, account_id: accountId, contact_id: contactId })
    .select(METHOD_COLUMNS)
    .returns<ContactMethod[]>()
    .single()
}

export async function removeContactMethod(id: string) {
  return supabase.from('contact_methods').delete().eq('id', id)
}

// Explicit, one call per attachment — the user chooses property and/or
// entity and a role every time a contact is linked; nothing here ever
// links a contact to every property an entity owns automatically. Never
// creates an account_members row or any access grant — this table has no
// relationship to authentication at all.
export async function createContactLink(accountId: string, contactId: string, scope: ContactLinkScope, role: string | null) {
  return supabase
    .from('contact_links')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      property_id: scope.propertyId ?? null,
      llc_id: scope.llcId ?? null,
      role,
    })
    .select('id, contact_id, property_id, llc_id, role, is_primary_contact')
    .single()
}

export async function removeContactLink(id: string) {
  return supabase.from('contact_links').delete().eq('id', id)
}

// Package 1 completion — the boundary check "Review saved contact
// details" needs before creating a link, so re-confirming the same
// reconciliation (a genuine retry, e.g. after a lost response, or simply
// reopening the modal and confirming again) completes idempotently
// instead of creating a second identical link every time.
export async function findContactLinkForScope(accountId: string, contactId: string, scope: ContactLinkScope) {
  let query = supabase.from('contact_links').select('id').eq('account_id', accountId).eq('contact_id', contactId)
  query = scope.propertyId ? query.eq('property_id', scope.propertyId) : query.eq('llc_id', scope.llcId ?? '')
  return query.maybeSingle()
}

// Same idempotent-retry reasoning as findContactLinkForScope — a method
// with the exact same (contact, type, value) is treated as already
// transferred, never duplicated by re-confirming.
export async function findContactMethodByValue(accountId: string, contactId: string, methodType: 'phone' | 'email', value: string) {
  return supabase
    .from('contact_methods')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .eq('method_type', methodType)
    .eq('value', value)
    .maybeSingle()
}

export async function setContactLinkPrimary(id: string, isPrimaryContact: boolean) {
  return supabase.from('contact_links').update({ is_primary_contact: isPrimaryContact }).eq('id', id)
}

interface RawLinkRow {
  id: string
  role: string | null
  is_primary_contact: boolean
  contact: {
    id: string
    account_id: string
    name: string
    notes: string | null
    archived: boolean
    contact_methods: ContactMethod[]
  } | null
}

function toLinkedContacts(rows: RawLinkRow[]): LinkedContact[] {
  return rows
    .filter((row): row is RawLinkRow & { contact: NonNullable<RawLinkRow['contact']> } => row.contact !== null)
    .map((row) => ({
      link_id: row.id,
      role: row.role,
      is_primary_contact: row.is_primary_contact,
      contact: {
        id: row.contact.id,
        account_id: row.contact.account_id,
        name: row.contact.name,
        notes: row.contact.notes,
        archived: row.contact.archived,
        methods: row.contact.contact_methods,
      },
    }))
}

// Every contact linked to a given entity, with their methods embedded —
// one round trip for the whole Contacts box.
export async function listContactsForLlc(accountId: string, llcId: string) {
  const { data, error } = await supabase
    .from('contact_links')
    .select('id, role, is_primary_contact, contact:contacts(id, account_id, name, notes, archived, contact_methods(*))')
    .eq('account_id', accountId)
    .eq('llc_id', llcId)
    .returns<RawLinkRow[]>()

  if (error || !data) return { data: null, error }
  return { data: toLinkedContacts(data), error: null }
}

export async function listContactsForProperty(accountId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('contact_links')
    .select('id, role, is_primary_contact, contact:contacts(id, account_id, name, notes, archived, contact_methods(*))')
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .returns<RawLinkRow[]>()

  if (error || !data) return { data: null, error }
  return { data: toLinkedContacts(data), error: null }
}
