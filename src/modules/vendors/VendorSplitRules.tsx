import { useState } from 'react'
import { useVendorSplitRules } from './useVendorSplitRules'
import type { Vendor } from './vendorsQueries'

interface EditRowProps {
  vendor: Vendor
  saving: boolean
  onSave: (percentage: number | null, description: string | null) => void
  onCancel: () => void
}

function EditRow({ vendor, saving, onSave, onCancel }: EditRowProps) {
  const [percentage, setPercentage] = useState(vendor.split_percentage?.toString() ?? '')
  const [description, setDescription] = useState(vendor.split_description ?? '')

  const handleSave = () => {
    const parsed = Number(percentage)
    if (!(parsed > 0 && parsed <= 100)) return
    onSave(parsed, description.trim() || null)
  }

  return (
    <tr>
      <td>{vendor.name}</td>
      <td>
        <input
          type="number"
          min="0.01"
          max="100"
          step="0.01"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          aria-label={`Split percentage for ${vendor.name}`}
        />
        %
      </td>
      <td>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Split with tenant"
          aria-label={`Split description for ${vendor.name}`}
        />
      </td>
      <td>
        <button type="button" onClick={handleSave} disabled={saving || !(Number(percentage) > 0 && Number(percentage) <= 100)}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </td>
    </tr>
  )
}

export function VendorSplitRules() {
  const { vendors, loading, error, editingId, startEditing, cancelEditing, saving, saveSplitRule, clearSplitRule } =
    useVendorSplitRules()

  return (
    <section>
      <h2>Vendor split rules</h2>
      <p>
        A saved reimbursement percentage per vendor (roadmap 8.8). Saving a rule here never applies it to any
        transaction automatically — logging a transaction against this vendor will offer a one-click "Apply saved
        split" action, but only the explicit click creates the reimbursement.
      </p>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : vendors.length === 0 ? (
        <p className="empty-state">No vendors yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Split %</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) =>
              editingId === vendor.id ? (
                <EditRow
                  key={vendor.id}
                  vendor={vendor}
                  saving={saving}
                  onSave={(pct, desc) => saveSplitRule(vendor.id, pct, desc)}
                  onCancel={cancelEditing}
                />
              ) : (
                <tr key={vendor.id}>
                  <td>{vendor.name}</td>
                  <td colSpan={2}>
                    {vendor.split_percentage != null
                      ? `${vendor.split_percentage}% — ${vendor.split_description ?? 'no description'}`
                      : 'No split rule'}
                  </td>
                  <td>
                    <button type="button" onClick={() => startEditing(vendor.id)}>
                      {vendor.split_percentage != null ? 'Edit split rule' : 'Set split rule'}
                    </button>
                    {vendor.split_percentage != null && (
                      <button type="button" onClick={() => clearSplitRule(vendor.id)} disabled={saving}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}
