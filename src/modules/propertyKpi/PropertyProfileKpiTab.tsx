import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { useMarketFinancialSnapshot } from './useMarketFinancialSnapshot'
import { MarketFinancialSnapshotCard } from './MarketFinancialSnapshotCard'
import { useOccupancySnapshot } from './useOccupancySnapshot'
import { OccupancySnapshotCard } from './OccupancySnapshotCard'
import { useActionQueue } from '../actionQueue/useActionQueue'
import { FollowUpsCard } from './FollowUpsCard'
import type { Transaction } from '../financials/financialsQueries'

interface PropertyProfileKpiTabProps {
  propertyId: string
  transactions: Transaction[]
}

// Roadmap 7.13 — KPI tab, three collapsible cards.
export function PropertyProfileKpiTab({ propertyId, transactions }: PropertyProfileKpiTabProps) {
  const { snapshot: marketFinancialSnapshot, loading: marketLoading, error: marketError } =
    useMarketFinancialSnapshot(propertyId, transactions)
  const { snapshot: occupancySnapshot, loading: occupancyLoading, error: occupancyError } =
    useOccupancySnapshot(propertyId)
  const {
    groups: followUpGroups,
    loading: followUpsLoading,
    error: followUpsError,
    processingId: followUpsProcessingId,
    complete: completeFollowUp,
  } = useActionQueue(propertyId)

  return (
    <>
      <CollapsibleSection title="Market & financial snapshot" defaultOpen>
        <MarketFinancialSnapshotCard loading={marketLoading} error={marketError} snapshot={marketFinancialSnapshot} />
      </CollapsibleSection>

      <CollapsibleSection title="Occupancy snapshot" defaultOpen>
        <OccupancySnapshotCard loading={occupancyLoading} error={occupancyError} snapshot={occupancySnapshot} />
      </CollapsibleSection>

      <CollapsibleSection title="Follow-ups" defaultOpen>
        <FollowUpsCard
          loading={followUpsLoading}
          error={followUpsError}
          groups={followUpGroups}
          processingId={followUpsProcessingId}
          onComplete={completeFollowUp}
        />
      </CollapsibleSection>
    </>
  )
}
