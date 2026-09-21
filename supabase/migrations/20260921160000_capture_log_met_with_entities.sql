-- Roadmap 1.28 — Visit's "Who was met with" becomes a real entity
-- picker (searches Vendors, account-wide, and Tenants, scoped to the
-- selected property) instead of free text, with a "Someone else"
-- free-text fallback for one-off visitors who are neither.
--
-- met_with (added by 20260918170000_capture_log_type_fields.sql) is
-- kept, but its meaning narrows: it now only ever holds the "Someone
-- else" free-text name. Whichever of the three is actually in use is
-- an application-layer choice (selecting an entity clears the other two,
-- typing a free-text name clears both FKs) — the DB only enforces that
-- the two FKs can't both point somewhere at once, same spirit as
-- financial_transactions' own single-source-of-truth constraints.
alter table capture_log add column met_with_vendor_id uuid references vendors(id) on delete set null;
alter table capture_log add column met_with_tenant_id uuid references tenants(id) on delete set null;

alter table capture_log add constraint capture_log_met_with_vendor_or_tenant
  check (met_with_vendor_id is null or met_with_tenant_id is null);
