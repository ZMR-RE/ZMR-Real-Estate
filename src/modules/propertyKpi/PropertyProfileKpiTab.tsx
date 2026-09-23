import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { useMarketFinancialSnapshot } from './useMarketFinancialSnapshot'
import { MarketFinancialSnapshotCard } from './MarketFinancialSnapshotCard'
import { useOccupancySnapshot } from './useOccupancySnapshot'
import { OccupancySnapshotCard } from './OccupancySnapshotCard'
import { useActionQueue } from '../actionQueue/useActionQueue'
import { FollowUpsCard } from './FollowUpsCard'
import { usePropertyTaxTrend } from './usePropertyTaxTrend'
import { PropertyTaxTrendCard } from './PropertyTaxTrendCard'
import { useKpiTrendChart } from './useKpiTrendChart'
import { KpiTrendChart } from './KpiTrendChart'
import { KpiHeadline } from './KpiHeadline'
import { KpiQuickStats } from './KpiQuickStats'
import { MortgagePayoffProgressBar } from './MortgagePayoffProgressBar'
import type { Property } from '../properties/propertiesQueries'
import type { Transaction } from '../financials/financialsQueries'

interface PropertyProfileKpiTabProps {
  property: Property
  transactions: Transaction[]
}

// Roadmap 7.13 — KPI tab, collapsible cards. Roadmap 7.24 added the 4th
// (Property taxes), the "tax-trend card" 9.5 originally named as this
// data's destination.
//
// Roadmap 7.38 — KPI is now the Property Profile's first tab (see
// PropertyProfile.tsx's TABS order). This adds: a one-line auto-
// generated headline and a 3-stat quick-stats strip at the very top
// (both purely derived from data already logged elsewhere — no new
// entry); a combined Market value/Rent estimate/Property tax paid
// trend chart with a per-series toggle; and a mortgage payoff progress
// bar alongside the existing equity/LTV figures. `property` is a new
// prop this tab didn't need before — purchase_price/purchase_date for
// the headline and quick stats.
export function PropertyProfileKpiTab({ property, transactions }: PropertyProfileKpiTabProps) {
  const { snapshot: marketFinancialSnapshot, loading: marketLoading, error: marketError } =
    useMarketFinancialSnapshot(property.id, transactions)
  const { snapshot: occupancySnapshot, loading: occupancyLoading, error: occupancyError } =
    useOccupancySnapshot(property.id)
  const {
    groups: followUpGroups,
    loading: followUpsLoading,
    error: followUpsError,
    processingId: followUpsProcessingId,
    complete: completeFollowUp,
  } = useActionQueue(property.id)
  const { years: taxTrendYears, loading: taxTrendLoading, error: taxTrendError } = usePropertyTaxTrend(property.id)
  const { series: kpiTrendSeries, loading: kpiTrendLoading, error: kpiTrendError } = useKpiTrendChart(property.id)

  return (
    <>
      <KpiHeadline
        purchasePrice={property.purchase_price}
        purchaseDate={property.purchase_date}
        originalLoanAmount={marketFinancialSnapshot.originalLoanAmount}
        currentEquity={marketFinancialSnapshot.equity?.equity ?? null}
      />

      <KpiQuickStats
        purchaseDate={property.purchase_date}
        currentEquity={marketFinancialSnapshot.equity?.equity ?? null}
      />

      <CollapsibleSection title="Value & tax trend" defaultOpen>
        {kpiTrendLoading ? (
          <p>Loading…</p>
        ) : kpiTrendError ? (
          <p role="alert">{kpiTrendError}</p>
        ) : (
          <KpiTrendChart series={kpiTrendSeries} />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Market & financial snapshot" defaultOpen>
        <MarketFinancialSnapshotCard loading={marketLoading} error={marketError} snapshot={marketFinancialSnapshot} />
        <MortgagePayoffProgressBar
          originalLoanAmount={marketFinancialSnapshot.originalLoanAmount}
          currentBalance={marketFinancialSnapshot.currentBalance}
        />
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

      <CollapsibleSection title="Property taxes" defaultOpen>
        <PropertyTaxTrendCard loading={taxTrendLoading} error={taxTrendError} years={taxTrendYears} />
      </CollapsibleSection>
    </>
  )
}
