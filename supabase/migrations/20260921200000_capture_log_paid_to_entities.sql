-- Roadmap 1.31 — Receipt's "Vendor" field becomes the same
-- Vendors/Tenants/Potential-tenants entity picker Visit's "who was met
-- with" already uses (1.28), so a receipt can be paid to (or received
-- from) a tenant or potential tenant too, e.g. reimbursing a tenant or
-- refunding a prospect's deposit — not just a Vendor.
--
-- vendor_id (added by 20260921100000, roadmap 1.17) is kept in place —
-- never dropped, per CLAUDE.md's data-safety rule — but backfilled into
-- paid_to_vendor_id below and never written by the UI again, same
-- precedent as met_with/met_with_vendor_id in 20260921160000.
alter table capture_log add column paid_to_vendor_id uuid references vendors(id) on delete set null;
alter table capture_log add column paid_to_tenant_id uuid references tenants(id) on delete set null;
alter table capture_log add column paid_to_prospective_tenant_id uuid references prospective_tenants(id) on delete set null;

update capture_log set paid_to_vendor_id = vendor_id where vendor_id is not null;

alter table capture_log add constraint capture_log_paid_to_single_entity
  check (
    (paid_to_vendor_id is not null)::int
    + (paid_to_tenant_id is not null)::int
    + (paid_to_prospective_tenant_id is not null)::int <= 1
  );
