import type { ComponentType } from 'react'
import type { Property } from './propertiesQueries'
import { LivingAreaIcon, MonthlyRentIcon, OccupancyIcon, YearBuiltIcon } from './propertyFieldGroupIcons'

const rentFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

interface PropertyPhysicalFactsStatsProps {
  property: Property
  // Roadmap 7.47 — Units/Occupied replace Bedrooms/Bathrooms as headline
  // stats. Unlike the other two stats (read straight off `property`),
  // these come from the Units box's own data (units.status), fetched by
  // PropertySummary via the same useOccupancySnapshot hook the KPI tab's
  // Occupancy Snapshot card already uses — one computation, two
  // consumers, not a second implementation of "what counts as occupied."
  // undefined while that fetch is still in flight (renders neither
  // card, same as any other stat with nothing to show yet).
  unitStats: { totalUnits: number; rentedUnits: number } | undefined
  // Units/Lease/Tenant rebuild, Stage 9 — sum of every currently-active
  // lease's rent_amount for the property (leasesQueries.ts's
  // sumActiveLeaseRentForProperty), one figure per lease so co-tenants
  // never get double-counted. Same undefined-while-loading/null-when-
  // nothing-to-show convention as unitStats.
  monthlyRent: number | null | undefined
}

interface Stat {
  key: string
  Icon: ComponentType
  value: string
  label: string
  // Roadmap 7.52 — only the merged Units occupied stat ever sets this;
  // every other stat renders in the default --text-h color.
  colorVariant?: 'success' | 'warning' | 'danger'
}

// Roadmap 7.38 (1)/7.47/7.52 — Physical facts redesign: headline stat
// cards (big bold number, small icon, small label) up top, everything
// else that used to live in Physical facts in a quieter "Details"
// sub-list below (see PropertySummary.tsx, which renders this
// component then that group's own field-grid under a "Details"
// sub-heading). Same Empty field visibility rule as every other box in
// this app — a stat with genuinely no value renders no card at all.
//
// Units/Lease/Tenant rebuild, Stage 9 — the 4th "Monthly rent" card
// (7.52 deliberately held it back: tenant_units summed rent per TENANT
// row, so co-tenants on one unit could get double-counted). Now safe:
// leases/lease_tenants (built earlier in this same rebuild) give one
// rent figure per lease regardless of how many tenants share it.
// Omitted entirely (not "$0 — Not set up") when there's nothing
// active to sum — that warning-colored treatment is specific to a
// single UNIT's own rent line inside the Units box (a data-entry gap
// on a unit that's supposedly occupied), not this property-wide
// summary card, which follows the same plain Empty field visibility
// rule as Year built/Living area above it.
function buildStats(
  property: Property,
  unitStats: { totalUnits: number; rentedUnits: number } | undefined,
  monthlyRent: number | null | undefined,
): Stat[] {
  const stats: Stat[] = []

  if (unitStats && unitStats.totalUnits > 0) {
    const { totalUnits, rentedUnits } = unitStats
    const colorVariant: Stat['colorVariant'] =
      rentedUnits === totalUnits ? 'success' : rentedUnits === 0 ? 'danger' : 'warning'
    stats.push({
      key: 'units-occupied',
      Icon: OccupancyIcon,
      value: `${rentedUnits} of ${totalUnits}`,
      label: 'Units occupied',
      colorVariant,
    })
  }
  if (monthlyRent !== null && monthlyRent !== undefined) {
    stats.push({
      key: 'monthly-rent',
      Icon: MonthlyRentIcon,
      value: rentFormatter.format(monthlyRent),
      label: 'Monthly rent',
    })
  }
  if (property.year_built !== null && property.year_built !== '') {
    stats.push({ key: 'year-built', Icon: YearBuiltIcon, value: property.year_built, label: 'Year built' })
  }
  if (property.square_footage !== null && property.square_footage !== '') {
    stats.push({
      key: 'living-area',
      Icon: LivingAreaIcon,
      value: Number(property.square_footage).toLocaleString(),
      label: 'Living area (sq ft)',
    })
  }

  return stats
}

// Exported so PropertySummary can decide whether to render the whole
// Physical facts section at all (CLAUDE.md's Empty field visibility
// rule — a group with nothing to show, stats or details, is skipped
// entirely rather than showing a bare title) without duplicating the
// checks above. Unit stats still loading counts as "nothing to show
// yet" here — the section reappears once that fetch resolves, same as
// it would if it were the deciding factor for any other field.
export function hasPhysicalFactsStats(
  property: Property,
  unitStats: { totalUnits: number; rentedUnits: number } | undefined,
  monthlyRent: number | null | undefined,
): boolean {
  return buildStats(property, unitStats, monthlyRent).length > 0
}

export function PropertyPhysicalFactsStats({ property, unitStats, monthlyRent }: PropertyPhysicalFactsStatsProps) {
  const stats = buildStats(property, unitStats, monthlyRent)

  if (stats.length === 0) return null

  return (
    <div className="property-stat-cards">
      {stats.map((stat) => (
        <div className="property-stat-card" key={stat.key}>
          <stat.Icon />
          <div
            className={`property-stat-card-value${stat.colorVariant ? ` property-stat-card-value--${stat.colorVariant}` : ''}`}
          >
            {stat.value}
          </div>
          <div className="property-stat-card-label">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
