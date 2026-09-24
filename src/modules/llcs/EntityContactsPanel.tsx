import { useState } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { useEntityContacts } from './useEntityContacts'

interface EntityContactsPanelProps {
  llcId: string
}

// Contacts box (G2) — reusable people with multiple labeled phone/email
// methods, explicitly linked to this entity with a role. Always visible/
// editable (no EditableSection view/edit toggle) for the same reason
// LlcFinancialAccountsPanel.tsx gives for its own admin panel: this
// already sits behind one click-to-expand (the entity profile's
// CollapsibleSection), so a second nested toggle would be one click too
// many for what's meant to be a quick list-management surface.
export function EntityContactsPanel({ llcId }: EntityContactsPanelProps) {
  const { contacts, contactOptions, refreshContactOptions, loading, error, saving, linkExisting, createAndLink, addMethod, unlink } =
    useEntityContacts(llcId)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [role, setRole] = useState('')
  const [addingMethodFor, setAddingMethodFor] = useState<string | null>(null)
  const [methodType, setMethodType] = useState<'phone' | 'email'>('phone')
  const [methodValue, setMethodValue] = useState('')
  const [methodLabel, setMethodLabel] = useState('')

  const handleLink = async () => {
    let ok = false
    if (isCreatingNew) {
      if (!newContactName.trim()) return
      ok = await createAndLink(newContactName.trim(), role.trim() || null)
    } else {
      if (!selectedContactId) return
      ok = await linkExisting(selectedContactId, role.trim() || null)
    }
    if (ok) {
      setSelectedContactId(null)
      setIsCreatingNew(false)
      setNewContactName('')
      setRole('')
    }
  }

  const handleAddMethod = async (contactId: string) => {
    if (!methodValue.trim()) return
    const ok = await addMethod(contactId, {
      method_type: methodType,
      value: methodValue.trim(),
      label: methodLabel.trim() || null,
      is_preferred: false,
    })
    if (ok) {
      setAddingMethodFor(null)
      setMethodValue('')
      setMethodLabel('')
    }
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="empty-state">No contacts linked yet.</p>
      ) : (
        contacts.map((linked) => (
          <div key={linked.link_id}>
            <strong>{linked.contact.name}</strong>
            {linked.role && <span> — {linked.role}</span>}
            <button type="button" onClick={() => unlink(linked.link_id)} disabled={saving}>
              Unlink
            </button>
            <ul>
              {linked.contact.methods.map((method) => (
                <li key={method.id}>
                  {method.label ? `${method.label}: ` : ''}
                  {method.value}
                  {method.is_preferred ? ' (preferred)' : ''}
                </li>
              ))}
            </ul>
            {addingMethodFor === linked.contact.id ? (
              <div className="field-column">
                <select value={methodType} onChange={(e) => setMethodType(e.target.value as 'phone' | 'email')}>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                </select>
                <input
                  placeholder={methodType === 'phone' ? 'Phone number' : 'Email address'}
                  value={methodValue}
                  onChange={(e) => setMethodValue(e.target.value)}
                />
                <PickListSelect
                  id={`method_label_${linked.contact.id}`}
                  listName="contact_method_label"
                  title="Contact method labels"
                  value={methodLabel}
                  onChange={setMethodLabel}
                  placeholder="Label (e.g. Mobile, Work)…"
                />
                <button type="button" disabled={saving || !methodValue.trim()} onClick={() => handleAddMethod(linked.contact.id)}>
                  Add method
                </button>
                <button type="button" onClick={() => setAddingMethodFor(null)} disabled={saving}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingMethodFor(linked.contact.id)}>
                + Add phone/email
              </button>
            )}
          </div>
        ))
      )}

      <h4 className="property-details-title">Link a contact</h4>
      <div className="field-column">
        <label htmlFor="entity_contact_search">Person or organization</label>
        {isCreatingNew ? (
          <input
            id="entity_contact_name"
            placeholder="New contact's name"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
          />
        ) : (
          <SearchableSelect
            options={contactOptions}
            value={selectedContactId}
            onChange={setSelectedContactId}
            onOpen={refreshContactOptions}
            placeholder="Search existing contacts…"
            onAddNew={() => setIsCreatingNew(true)}
            addNewLabel="+ Add a new contact"
          />
        )}
        <label htmlFor="entity_contact_role">Role</label>
        <PickListSelect
          id="entity_contact_role"
          listName="contact_role"
          title="Contact roles"
          value={role}
          onChange={setRole}
          placeholder="e.g. Property manager, Attorney, Co-owner contact"
        />
        <p>
          Linking a contact here never grants them login access or copies them onto every property this entity owns — each
          attachment is its own explicit choice.
        </p>
        <button type="button" disabled={saving || (isCreatingNew ? !newContactName.trim() : !selectedContactId)} onClick={handleLink}>
          Link contact
        </button>
        {isCreatingNew && (
          <button type="button" onClick={() => setIsCreatingNew(false)} disabled={saving}>
            Cancel new contact
          </button>
        )}
      </div>
    </div>
  )
}
