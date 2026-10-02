import { useState } from 'react'

// One save at a time, for the tenancy saves (new lease, resumed lease,
// co-tenant link, inline new tenant) in both Tenants › + Add tenant and
// Units › + Add lease.
//
// - A second call while one is running is ignored immediately — before any
//   re-render — so a burst of clicks or Enter presses can't start a second
//   lease, tenant or link write, however slow the response.
// - A failure (returned or thrown) releases the guard, so retry works.
// - A success can lock the guard (`lockWhen`) until `reset()` — the form that
//   just saved can't save again in the moment before it closes; starting a new
//   add resets it.
//
// A browser-side guard only: it does not replace the planned atomic,
// idempotent database operation for creating a lease with its tenants.
export function createSingleFlight() {
  let busy = false
  let locked = false
  return {
    async run<T>(fn: () => Promise<T>, lockWhen?: (value: T) => boolean): Promise<{ ran: true; value: T } | { ran: false }> {
      if (busy || locked) return { ran: false }
      busy = true
      try {
        const value = await fn()
        if (lockWhen?.(value)) locked = true
        return { ran: true, value }
      } finally {
        busy = false
      }
    },
    reset() {
      locked = false
    },
  }
}

export type SingleFlight = ReturnType<typeof createSingleFlight>

// The same guard, created once and kept for the life of a component.
export function useSingleFlight(): SingleFlight {
  const [flight] = useState(createSingleFlight)
  return flight
}
