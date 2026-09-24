import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  addContactMethod,
  createContact,
  createContactLink,
  listContacts,
  listContactsForLlc,
  removeContactLink,
  type ContactMethodInput,
  type LinkedContact,
} from '../contacts/contactsQueries'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'

// Entity profile Contacts box logic. G2: a contact is explicitly linked
// with a role each time — linking here never touches account_members or
// grants any access; it is reachable information only.
export function useEntityContacts(llcId: string) {
  const { accountId } = useAuth()
  const [contacts, setContacts] = useState<LinkedContact[]>([])
  const [contactOptions, setContactOptions] = useState<SearchableSelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listContactsForLlc(accountId, llcId)
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setContacts(data ?? [])
  }, [accountId, llcId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Every account contact, for the "search existing, or add new" picker
  // — refreshed on the picker's own open (via onOpen), not just when
  // llcId changes, per CLAUDE.md's cross-module data-freshness rule: a
  // contact created elsewhere while this picker is already mounted must
  // still show up without a page reload.
  const refreshContactOptions = useCallback(async () => {
    if (!accountId) return
    const { data } = await listContacts(accountId)
    setContactOptions((data ?? []).map((c) => ({ id: c.id, label: c.name })))
  }, [accountId])

  useEffect(() => {
    refreshContactOptions()
  }, [refreshContactOptions])

  // Links an existing contact (contactId known) with a role.
  const linkExisting = async (contactId: string, role: string | null) => {
    if (!accountId) return false
    setSaving(true)
    const { error: linkError } = await createContactLink(accountId, contactId, { llcId }, role)
    setSaving(false)
    if (linkError) {
      setError(linkError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  // Creates a brand-new person, then links them in one step — the
  // "search existing contacts, or add a new one" inline-create pattern
  // every other picker in this app already uses (SearchableSelect's
  // onAddNew).
  const createAndLink = async (name: string, role: string | null) => {
    if (!accountId) return false
    setSaving(true)
    const { data: contact, error: createError } = await createContact(accountId, { name, notes: null })
    if (createError || !contact) {
      setSaving(false)
      setError(createError?.message ?? 'Could not create contact')
      return false
    }
    const { error: linkError } = await createContactLink(accountId, contact.id, { llcId }, role)
    setSaving(false)
    if (linkError) {
      setError(linkError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  const addMethod = async (contactId: string, input: ContactMethodInput) => {
    if (!accountId) return false
    setSaving(true)
    const { error: methodError } = await addContactMethod(accountId, contactId, input)
    setSaving(false)
    if (methodError) {
      setError(methodError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  const unlink = async (linkId: string) => {
    setSaving(true)
    const { error: removeError } = await removeContactLink(linkId)
    setSaving(false)
    if (removeError) {
      setError(removeError.message)
      return false
    }
    setError(null)
    await refresh()
    return true
  }

  return { contacts, contactOptions, refreshContactOptions, loading, error, saving, linkExisting, createAndLink, addMethod, unlink }
}
