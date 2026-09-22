import { CollapsibleSection } from '../../shared/CollapsibleSection'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { PropertyProfileActivityTab } from './PropertyProfileActivityTab'
import { PropertyProfileHistoryTab } from './PropertyProfileHistoryTab'
import type { ActivityLogEntry } from '../capture/captureQueries'
import type { Property } from './propertiesQueries'

interface PropertyProfileActivityHistoryTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  activity: ActivityLogEntry[]
}

// Roadmap 7.26 — reverses 7.9/7.14's merge: Activity & Documents split
// back into two separate tabs, per explicit user confirmation. This is
// the "Activity" tab's content (Activity log + History/audit trail from
// 7.8); Documents (2.5) is now its own tab, rendering
// PropertyProfileDocumentsTab directly from PropertyProfile.tsx since it
// already owns its own CollapsibleSection (roadmap 2.7) and needs no
// wrapper.
export function PropertyProfileActivityHistoryTab({
  property,
  llcOptions,
  activity,
}: PropertyProfileActivityHistoryTabProps) {
  return (
    <>
      <CollapsibleSection title="Activity log" defaultOpen>
        <PropertyProfileActivityTab entries={activity} />
      </CollapsibleSection>

      <CollapsibleSection title="History">
        <PropertyProfileHistoryTab property={property} llcOptions={llcOptions} />
      </CollapsibleSection>
    </>
  )
}
