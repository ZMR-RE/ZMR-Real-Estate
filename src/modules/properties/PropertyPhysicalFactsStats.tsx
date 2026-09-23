import type { ComponentType } from 'react'
import type { Property } from './propertiesQueries'
import { LivingAreaIcon, OccupancyIcon, YearBuiltIcon } from './propertyFieldGroupIcons'

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
// Roadmap 7.52 — the separate Units and Occupied cards (7.47) are
// merged into one "Units occupied" card ("{rented} of {total}", colored
// by occupancy rate), per the approved design. This item also scoped a
// 4th "Monthly rent" stat card, deliberately NOT built here: building it
// surfaced a real pre-existing data-model gap (tenant_units stores rent
// per TENANT row, not per lease — no lease_id/grouping construct exists,
// so summing rent_amount across co-tenants on one unit can silently
// double-count, and there's no safe way to dedupe it without risking the
// opposite mistake). Held back per explicit direction rather than
// shipping a naive sum — Monthly rent will be built properly as part of
// the upcoming Tenants & Occupancy redesign, which addresses this same
// co-tenant/lease structure gap directly. No 4th card slot or "Coming
// soon" placeholder in the meantime — omitted entirely, same as any
// other stat with nothing (real) to show, rather than a stub UI element
// for a feature that doesn't exist yet.
//
// Units occupied follows the same suppression rule the old Occupied
// card used (0 total units → nothing meaningful to report, card omitted
// entirely) rather than the old Units card's "always show, even 0" rule
// — merging the two numbers into one fraction means "0 of 0" would be
// the only remaining zero-state, and that's not a meaningful answer
// either.
function buildStats(
  property: Property,
  unitStats: { totalUnits: number; rentedUnits: number } | undefined,
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
): boolean {
  return buildStats(property, unitStats).length > 0
}

export function PropertyPhysicalFactsStats({ property, unitStats }: PropertyPhysicalFactsStatsProps) {
  const stats = buildStats(property, unitStats)

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
