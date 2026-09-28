import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  listContacts,
  createContact,
  createContactLink,
  addContactMethod,
  findContactLinkForScope,
  findContactMethodByValue,
  type Contact,
} from '../contacts/contactsQueries'
import { markLegacyContactReconciled } from './propertiesQueries'

interface ReviewSavedContactDetailsModalProps {
  propertyId: string
  legacyOwnerName: string | null
  legacyContactPhone: string | null
  legacyContactEmail: string | null
  onClose: () => void
}

// Package 1 §3 — "Review saved contact details" (owner-approved label,
// Sept 25 2026). Opens a review of the property's legacy owner_name/
// contact_phone/contact_email BEFORE anything saves; the user picks an
// existing contact or creates a new one, chooses which legacy values to
// carry over as that contact's own methods, and an explicit role. The
// legacy fields on properties are never cleared or altered by this —
// only property.legacy_contact_reconciled_at is set, once confirmed,
// recording that a human looked at this and made an explicit choice.
export function ReviewSavedContactDetailsModal({
  propertyId,
  legacyOwnerName,
  legacyContactPhone,
  legacyContactEmail,
  onClose,
}: ReviewSavedContactDetailsModalProps) {
  const { accountId } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'existing' | 'new'>(legacyOwnerName ? 'new' : 'existing')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [newContactName, setNewContactName] = useState(legacyOwnerName ?? '')
  const [role, setRole] = useState('')
  const [transferPhone, setTransferPhone] = useState(!!legacyContactPhone)
  const [transferEmail, setTransferEmail] = useState(!!legacyContactEmail)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!accountId) return
    listContacts(accountId).then(({ data }) => {
      setContacts(data ?? [])
      setLoading(false)
    })
  }, [accountId])

  const handleConfirm = async () => {
    if (!accountId) return
    setError(null)

    let contactId = selectedContactId
    if (mode === 'new') {
      if (!newContactName.trim()) {
        setError('Enter a name for the new contact.')
        return
      }
      setSaving(true)
      const { data: created, error: createError } = await createContact(accountId, { name: newContactName.trim(), notes: null })
      if (createError || !created) {
        setSaving(false)
        setError(createError?.message ?? 'Could not create the contact.')
        return
      }
      contactId = created.id
    }
    if (!contactId) {
      setError('Select an existing contact or create a new one.')
      return
    }

    setSaving(true)

    // Package 1 completion — idempotent retry: re-confirming the same
    // reconciliation (reopening the modal and confirming again, or a
    // genuine retry after a lost response) must never create a second
    // link or a second copy of the same method. Checked immediately
    // before each insert, not just once at the top, since a link and
    // a method are independent boundaries that can each already exist
    // from a prior attempt in any combination.
    const { data: existingLink, error: linkLookupError } = await findContactLinkForScope(accountId, contactId, { propertyId })
    if (linkLookupError) {
      setSaving(false)
      setError(linkLookupError.message)
      return
    }
    if (!existingLink) {
      const { error: linkError } = await createContactLink(accountId, contactId, { propertyId }, role.trim() || null)
      if (linkError) {
        setSaving(false)
        setError(linkError.message)
        return
      }
    }

    if (transferPhone && legacyContactPhone) {
      const { data: existingPhone } = await findContactMethodByValue(accountId, contactId, 'phone', legacyContactPhone)
      if (!existingPhone) {
        await addContactMethod(accountId, contactId, { method_type: 'phone', value: legacyContactPhone, label: 'From property record', is_preferred: false })
      }
    }
    if (transferEmail && legacyContactEmail) {
      const { data: existingEmail } = await findContactMethodByValue(accountId, contactId, 'email', legacyContactEmail)
      if (!existingEmail) {
        await addContactMethod(accountId, contactId, { method_type: 'email', value: legacyContactEmail, label: 'From property record', is_preferred: false })
      }
    }

    await markLegacyContactReconciled(propertyId)
    setSaving(false)
    setDone(true)
  }

  return (
    <div role="dialog" aria-label="Review saved contact details" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
      <h4 className="property-details-title">Review saved contact details</h4>

      {done ? (
        <>
          <p>Linked to a real contact record. The original owner name/phone/email above are unchanged.</p>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </>
      ) : (
        <div className="field-column">
          <dl>
            <dt>Owner name on file</dt>
            <dd>{legacyOwnerName ?? '(none recorded)'}</dd>
            <dt>Contact phone on file</dt>
            <dd>{legacyContactPhone ?? '(none recorded)'}</dd>
            <dt>Contact email on file</dt>
            <dd>{legacyContactEmail ?? '(none recorded)'}</dd>
          </dl>
          <p className="field-hint">
            Nothing above changes. Choose where this information should live as a real, reusable contact — never
            confirmed or replaced automatically.
          </p>

          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading contacts…</p>
          ) : (
            <>
              <div className="field">
                <label>
                  <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} /> Link to an existing
                  contact
                </label>
              </div>
              {mode === 'existing' && (
                <div className="field">
                  <label htmlFor="review-contact-existing">Contact</label>
                  <select id="review-contact-existing" value={selectedContactId ?? ''} onChange={(e) => setSelectedContactId(e.target.value || null)}>
                    <option value="">Select…</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field">
                <label>
                  <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} /> Create a new contact
                </label>
              </div>
              {mode === 'new' && (
                <div className="field">
                  <label htmlFor="review-contact-new-name">New contact&rsquo;s name</label>
                  <input id="review-contact-new-name" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
                </div>
              )}

              <div className="field">
                <label htmlFor="review-contact-role">Role (optional)</label>
                <input id="review-contact-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Owner" />
              </div>

              {legacyContactPhone && (
                <label>
                  <input type="checkbox" checked={transferPhone} onChange={(e) => setTransferPhone(e.target.checked)} /> Add {legacyContactPhone} as this
                  contact&rsquo;s phone
                </label>
              )}
              {legacyContactEmail && (
                <label>
                  <input type="checkbox" checked={transferEmail} onChange={(e) => setTransferEmail(e.target.checked)} /> Add {legacyContactEmail} as this
                  contact&rsquo;s email
                </label>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button type="button" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirm} disabled={saving}>
                  {saving ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
