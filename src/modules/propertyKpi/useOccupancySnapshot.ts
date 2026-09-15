import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listUnits, type Unit } from '../units/unitsQueries'

export interface OccupancySnapshot {
  totalUnits: number
  rentedUnits: number
  occupancyRate: number | null
  byStatus: Record<string, number>
}

// Roadmap 7.13's Occupancy Snapshot card — computed from the same units
// data the Overview tab's Units box already manages (7.2), nothing new
// to store.
export function useOccupancySnapshot(propertyId: string) {
  const { accountId } = useAuth()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    listUnits(accountId, propertyId).then(({ data, error: fetchError }) => {
      setLoading(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      setError(null)
      setUnits(data ?? [])
    })
  }, [accountId, propertyId])

  const byStatus: Record<string, number> = {}
  for (const unit of units) {
    byStatus[unit.status] = (byStatus[unit.status] ?? 0) + 1
  }

  const totalUnits = units.length
  const rentedUnits = byStatus['Rented'] ?? 0

  const snapshot: OccupancySnapshot = {
    totalUnits,
    rentedUnits,
    occupancyRate: totalUnits > 0 ? rentedUnits / totalUnits : null,
    byStatus,
  }

  return { snapshot, loading, error }
}
