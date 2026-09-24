import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEntityLinkedProperties } from './useEntityLinkedProperties'

interface EntityLinkedPropertiesPanelProps {
  llcId: string
}

// Replaces the earlier OrganizationTypePropertiesPanel-based "Reassign"
// dropdown (which called updatePropertyLlc directly, with no reason
// captured) — this is the resolved fix for that bypass. "Remove this
// entity's interest" is the only ownership-change action here, and it
// goes through the identical shared function the property-side Ownership
// box uses, with the same required reason.
export function EntityLinkedPropertiesPanel({ llcId }: EntityLinkedPropertiesPanelProps) {
  const { properties, loading, error, removingId, removeInterest } = useEntityLinkedProperties(llcId)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const startRemove = (propertyId: string) => {
    setConfirmingId(propertyId)
    setReason('')
  }

  const confirmRemove = async (propertyId: string) => {
    if (!reason.trim()) return
    const ok = await removeInterest(propertyId, reason.trim())
    if (ok) setConfirmingId(null)
  }

  if (loading) return <p>Loading…</p>
  if (properties.length === 0) return <p className="empty-state">No properties linked yet.</p>

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Percentage</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.interest_id}>
              <td>
                <Link to={`/properties/${property.property_id}`}>{property.property_name}</Link>
              </td>
              <td>{property.percentage === null ? 'Not recorded' : `${property.percentage}%`}</td>
              <td>
                {confirmingId === property.property_id ? (
                  <div className="field-column">
                    <label htmlFor={`remove_reason_${property.property_id}`}>
                      Reason <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id={`remove_reason_${property.property_id}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. This entity was linked to the wrong property"
                    />
                    <p>
                      This corrects an entry mistake — nothing about legal ownership actually changes here. Recording an
                      actual legal ownership change isn&rsquo;t part of this release yet.
                    </p>
                    <button
                      type="button"
                      disabled={removingId === property.property_id || !reason.trim()}
                      onClick={() => confirmRemove(property.property_id)}
                    >
                      {removingId === property.property_id ? 'Removing…' : 'Confirm removal'}
                    </button>
                    <button type="button" onClick={() => setConfirmingId(null)} disabled={removingId === property.property_id}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => startRemove(property.property_id)}>
                    Remove this entity&rsquo;s interest
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
