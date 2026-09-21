import { supabase } from '../../shared/supabaseClient'

export interface MileageTrip {
  id: string
  property_id: string
  start_destination: string
  end_destination: string
  miles: string
}

const MILEAGE_TRIP_COLUMNS = 'id, property_id, start_destination, end_destination, miles'

// Roadmap 1.21 — trips are scoped per property (a route only makes sense
// suggested back for the same property it was originally logged
// against), listed for whichever property is currently selected in the
// Mileage form.
//
// PostgREST returns this numeric(8,1) column as a genuine JS number here
// (unlike other numeric columns elsewhere in this schema, which come
// back as strings) — confirmed by a real bug: selectTrip passing that
// raw number into milesDriven state made the create form's
// `milesDriven.trim()` throw (numbers have no .trim), silently aborting
// the whole submit() with no network request and no visible error.
// String(...) here guarantees every MileageTrip.miles consumer gets the
// string its type promises, regardless of what PostgREST does.
export async function listMileageTrips(accountId: string, propertyId: string) {
  const result = await supabase
    .from('mileage_trips')
    .select(MILEAGE_TRIP_COLUMNS)
    .eq('account_id', accountId)
    .eq('property_id', propertyId)
    .order('start_destination')
    .returns<MileageTrip[]>()

  if (result.data) {
    result.data = result.data.map((trip) => ({ ...trip, miles: String(trip.miles) }))
  }
  return result
}

// Called whenever a capture entry is saved (create or later edit) with
// start destination, end destination, and miles all present — remembers
// (or updates, if this exact start/end pair already exists for this
// property) the trip so it can be offered back later. The unique
// (account_id, property_id, start_destination, end_destination)
// constraint makes this a true upsert: re-logging the same route just
// refreshes its remembered mileage to the latest value rather than
// creating a duplicate.
export async function upsertMileageTrip(
  accountId: string,
  propertyId: string,
  startDestination: string,
  endDestination: string,
  miles: number,
) {
  return supabase
    .from('mileage_trips')
    .upsert(
      {
        account_id: accountId,
        property_id: propertyId,
        start_destination: startDestination,
        end_destination: endDestination,
        miles,
      },
      { onConflict: 'account_id,property_id,start_destination,end_destination' },
    )
    .select(MILEAGE_TRIP_COLUMNS)
    .single<MileageTrip>()
}
