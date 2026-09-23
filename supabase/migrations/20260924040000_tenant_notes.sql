-- Units/Lease/Tenant rebuild, Stage 7 — Tenant profile page needs a
-- notes field (roadmap item 5: "first/last name, email, phone, notes")
-- that doesn't exist on tenants today. Nullable, free text — same
-- shape as every other freeform notes column in this schema
-- (security_deposits.notes, utility_records.notes, etc.).
alter table tenants add column notes text;
