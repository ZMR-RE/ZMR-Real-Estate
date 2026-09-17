import { CollapsibleSection } from '../../shared/CollapsibleSection'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { PropertyProfileActivityTab } from './PropertyProfileActivityTab'
import { PropertyProfileHistoryTab } from './PropertyProfileHistoryTab'
import { PropertyProfileDocumentsTab } from './PropertyProfileDocumentsTab'
import type { ActivityLogEntry } from '../capture/captureQueries'
import type { DocumentRecord } from '../documents/documentsQueries'
import type { Property } from './propertiesQueries'

interface PropertyProfileActivityDocumentsTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  activity: ActivityLogEntry[]
  documents: DocumentRecord[]
  onViewDocument: (path: string) => void
}

// Roadmap 7.14 — merges what were three separate tabs (Activity Log,
// History/audit trail from 7.8, Documents from 2.5) into one, each its
// own collapsible box rather than three tabs to click between.
export function PropertyProfileActivityDocumentsTab({
  property,
  llcOptions,
  activity,
  documents,
  onViewDocument,
}: PropertyProfileActivityDocumentsTabProps) {
  return (
    <>
      <CollapsibleSection title="Activity log" defaultOpen>
        <PropertyProfileActivityTab entries={activity} />
      </CollapsibleSection>

      <CollapsibleSection title="History">
        <PropertyProfileHistoryTab property={property} llcOptions={llcOptions} />
      </CollapsibleSection>

      <CollapsibleSection title="Documents">
        <PropertyProfileDocumentsTab documents={documents} onView={onViewDocument} />
      </CollapsibleSection>
    </>
  )
}
