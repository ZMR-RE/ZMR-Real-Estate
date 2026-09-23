-- Units/Lease/Tenant rebuild, Stage 10 — 2169 Ash St correction
-- (roadmap item 9). Its default unit (auto-created by 20260923070000's
-- trigger, backfilled with status='' since no real default existed to
-- copy) gets its real status now: 'Rented' (the seeded unit_status
-- pick-list value for "occupied" — "Occupied" itself isn't one of the
-- four seeded options: Rented/Vacant - Ready/Renovating/Listed).
--
-- No lease or tenant created here — per the user's own explicit
-- instruction, they add the real tenant/lease themselves through the
-- new "+ Add lease" flow (Stage 5) now that it exists.
update units
set status = 'Rented'
where property_id = 'edc7e8e1-d08d-479f-b3d2-9266e87b45ad'
  and status = '';
