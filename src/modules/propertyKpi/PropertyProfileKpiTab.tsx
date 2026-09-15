import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { useMarketFinancialSnapshot } from './useMarketFinancialSnapshot'
import { MarketFinancialSnapshotCard } from './MarketFinancialSnapshotCard'
import { useOccupancySnapshot } from './useOccupancySnapshot'
import { OccupancySnapshotCard } from './OccupancySnapshotCard'
import { FollowUpsCard } from './FollowUpsCard'
import type { Transaction } from '../financials/financialsQueries'

interface PropertyProfileKpiTabProps {
  propertyId: string
  marketValue: string | null
  transactions: Transaction[]
}

// Roadmap 7.13 — KPI tab, three collapsible cards.
export function PropertyProfileKpiTab({ propertyId, marketValue, transactions }: PropertyProfileKpiTabProps) {
  const { snapshot: marketFinancialSnapshot, loading: marketLoading, error: marketError } =
    useMarketFinancialSnapshot(propertyId, marketValue, transactions)
  const { snapshot: occupancySnapshot, loading: occupancyLoading, error: occupancyError } =
    useOccupancySnapshot(propertyId)

  return (
    <>
      <CollapsibleSection title="Market & Financial Snapshot" defaultOpen>
        <MarketFinancialSnapshotCard loading={marketLoading} error={marketError} snapshot={marketFinancialSnapshot} />
      </CollapsibleSection>

      <CollapsibleSection title="Occupancy Snapshot" defaultOpen>
        <OccupancySnapshotCard loading={occupancyLoading} error={occupancyError} snapshot={occupancySnapshot} />
      </CollapsibleSection>

      <CollapsibleSection title="Follow-ups" defaultOpen>
        <FollowUpsCard />
      </CollapsibleSection>
    </>
  )
}
