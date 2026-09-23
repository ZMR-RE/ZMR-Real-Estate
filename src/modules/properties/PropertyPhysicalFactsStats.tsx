import type { ComponentType } from 'react'
import type { Property } from './propertiesQueries'
import { BathroomsIcon, BedroomsIcon, LivingAreaIcon, YearBuiltIcon } from './propertyFieldGroupIcons'

interface PropertyPhysicalFactsStatsProps {
  property: Property
}

interface Stat {
  key: string
  Icon: ComponentType
  value: string
  label: string
}

// Roadmap 7.38 (1) — Physical facts redesign: Bedrooms/Bathrooms/Living
// area/Year built pulled out of the plain field-grid into "headline
// stat" cards (big bold number, small icon, small label) — everything
// else that used to live in Physical facts moves into a quieter
// "Details" sub-list below these (see PropertySummary.tsx, which
// renders this component then that group's own now-smaller field-grid
// under a "Details" sub-heading). Same Empty field visibility rule as
// every other box in this app — a stat with no value renders no card
// at all, not a placeholder/zero.
function buildStats(property: Property): Stat[] {
  const stats: Stat[] = []

  if (property.bedroom_count !== null && property.bedroom_count !== '') {
    stats.push({ key: 'bedrooms', Icon: BedroomsIcon, value: property.bedroom_count, label: 'Bedrooms' })
  }
  if (property.bathroom_count !== null && property.bathroom_count !== '') {
    stats.push({ key: 'bathrooms', Icon: BathroomsIcon, value: property.bathroom_count, label: 'Bathrooms' })
  }
  if (property.square_footage !== null && property.square_footage !== '') {
    stats.push({
      key: 'living-area',
      Icon: LivingAreaIcon,
      value: Number(property.square_footage).toLocaleString(),
      label: 'Living area (sq ft)',
    })
  }
  if (property.year_built !== null && property.year_built !== '') {
    stats.push({ key: 'year-built', Icon: YearBuiltIcon, value: property.year_built, label: 'Year built' })
  }

  return stats
}

// Exported so PropertySummary can decide whether to render the whole
// Physical facts section at all (CLAUDE.md's Empty field visibility
// rule — a group with nothing to show, stats or details, is skipped
// entirely rather than showing a bare title) without duplicating the
// 4 field checks above.
export function hasPhysicalFactsStats(property: Property): boolean {
  return buildStats(property).length > 0
}

export function PropertyPhysicalFactsStats({ property }: PropertyPhysicalFactsStatsProps) {
  const stats = buildStats(property)

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
