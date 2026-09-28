import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listContacts, type Contact } from '../contacts/contactsQueries'
import { reconcileLegacyContact } from './propertiesQueries'

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
  // Release-readiness corrections (defect #1) — generated once when this
  // modal instance mounts, never regenerated on a failed attempt. A retry
  // (including two overlapping Confirm clicks firing before `saving`
  // disables the button) carries the SAME idempotency key, so
  // reconcile_legacy_contact's own reserve-or-fetch serializes them at
  // the database row lock and only one ever does real work — this is
  // what makes two simultaneous confirmations safe, not client-side
  // disabling alone. Reopening the modal fresh (a genuinely separate
  // attempt) gets a new key, exactly like the creation wizard's own
  // idempotencyKey.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    if (!accountId) return
    listContacts(accountId).then(({ data }) => {
      setContacts(data ?? [])
      setLoading(false)
    })
  }, [accountId])

  // Release-readiness corrections (defect #1) — a single atomic RPC call
  // now does everything (resolve/create the contact, resolve/create the
  // link, resolve/create each requested method, mark the property
  // reconciled). `done` is set ONLY on that call's own success; every
  // other path (validation, the RPC's own error) leaves `saving` false,
  // `done` false, and every field exactly as the user left it, so a
  // failed attempt can always be corrected and retried from the same
  // state rather than losing what was typed.
  const handleConfirm = async () => {
    if (!accountId) return
    if (mode === 'new' && !newContactName.trim()) {
      setError('Enter a name for the new contact.')
      return
    }
    if (mode === 'existing' && !selectedContactId) {
      setError('Select an existing contact or create a new one.')
      return
    }

    setError(null)
    setSaving(true)

    const { error: rpcError } = await reconcileLegacyContact(accountId, propertyId, {
      idempotencyKey,
      mode,
      existingContactId: mode === 'existing' ? selectedContactId : null,
      newContactName: mode === 'new' ? newContactName.trim() : null,
      role: role.trim() || null,
      phone: transferPhone && legacyContactPhone ? legacyContactPhone : null,
      email: transferEmail && legacyContactEmail ? legacyContactEmail : null,
    })

    setSaving(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

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
