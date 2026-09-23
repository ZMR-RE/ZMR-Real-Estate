import type { ComponentType } from 'react'
import type { Property } from './propertiesQueries'
import { LivingAreaIcon, OccupancyIcon, UnitsIcon, YearBuiltIcon } from './propertyFieldGroupIcons'

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
}

// Roadmap 7.38 (1)/7.47 — Physical facts redesign: headline stat cards
// (big bold number, small icon, small label) up top, everything else
// that used to live in Physical facts in a quieter "Details" sub-list
// below (see PropertySummary.tsx, which renders this component then
// that group's own field-grid under a "Details" sub-heading). Same
// Empty field visibility rule as every other box in this app — a stat
// with genuinely no value renders no card at all. Units is the one
// exception: 0 is a real, present answer ("no units configured on this
// property yet"), not missing data, so it always renders once the fetch
// resolves — Occupied is still omitted at 0 units, since "0 of 0" has
// nothing meaningful to report.
function buildStats(
  property: Property,
  unitStats: { totalUnits: number; rentedUnits: number } | undefined,
): Stat[] {
  const stats: Stat[] = []

  if (unitStats) {
    stats.push({ key: 'units', Icon: UnitsIcon, value: String(unitStats.totalUnits), label: 'Units' })
    if (unitStats.totalUnits > 0) {
      stats.push({
        key: 'occupied',
        Icon: OccupancyIcon,
        value: `${unitStats.rentedUnits} of ${unitStats.totalUnits}`,
        label: 'Occupied',
      })
    }
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
// yet" here — the section reappears once the fetch resolves, same as
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
          <div className="property-stat-card-value">{stat.value}</div>
          <div className="property-stat-card-label">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
