import { propertyLabel } from '../../shared/propertyLabel'
import type { MileageRollupRow } from './mileageQueries'

export interface MileageByProperty {
  propertyId: string
  propertyName: string
  totalMiles: number
}

export function summarizeMileageByProperty(rows: MileageRollupRow[]): MileageByProperty[] {
  const totals = new Map<string, MileageByProperty>()

  for (const row of rows) {
    if (!row.property) continue
    const existing = totals.get(row.property_id) ?? {
      propertyId: row.property_id,
      propertyName: propertyLabel(row.property),
      totalMiles: 0,
    }
    existing.totalMiles += row.miles
    totals.set(row.property_id, existing)
  }

  return Array.from(totals.values()).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
}
