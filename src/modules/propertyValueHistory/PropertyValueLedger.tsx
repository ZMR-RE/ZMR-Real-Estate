import { usePropertyValueHistory } from './usePropertyValueHistory'
import { PropertyValueHistoryList } from './PropertyValueHistoryList'
import { PropertyValueHistoryForm } from './PropertyValueHistoryForm'
import type { ValueMetric } from './propertyValueHistoryQueries'

interface PropertyValueLedgerProps {
  propertyId: string
  metric: ValueMetric
  title: string
  emptyMessage: string
  onChanged: () => Promise<void>
}

// One metric's dated log (roadmap 7.19) — wires the hook to its List/Form,
// same composition PropertyTaxLedger uses. PropertyValueHistorySection
// renders two of these (market_value, rent_value) on the Overview tab.
// onChanged notifies the parent property profile (Mortgage tab's equity/
// LTV reads the latest market_value entry) so a new/voided entry here is
// reflected there immediately, per the Single source of truth rule.
export function PropertyValueLedger({ propertyId, metric, title, emptyMessage, onChanged }: PropertyValueLedgerProps) {
  const { entries, loading, error, saving, formInitialValues, addEntry, voidEntry } = usePropertyValueHistory(
    propertyId,
    metric,
  )

  const handleSave = async (input: Parameters<typeof addEntry>[0]) => {
    const succeeded = await addEntry(input)
    if (succeeded) await onChanged()
    return succeeded
  }

  const handleVoid = async (id: string) => {
    const succeeded = await voidEntry(id)
    if (succeeded) await onChanged()
  }

  return (
    <div>
      <h3>{title}</h3>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <PropertyValueHistoryList entries={entries} onVoid={handleVoid} voiding={saving} emptyMessage={emptyMessage} />
      )}
      <PropertyValueHistoryForm
        idPrefix={`${metric}_${propertyId}`}
        initialValues={formInitialValues}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  )
}
