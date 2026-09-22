-- Roadmap 9.9 (Quick Capture → Financials bridge) — financial_transactions
-- has always required a vendor_id (not null, vendor-only). Quick
-- Capture's Receipt "Paid to / Received from" field (roadmap 1.31) can
-- already point at a vendor, a tenant, or a prospective tenant, or be
-- left blank entirely (vendor was never required to mark a Receipt
-- "Complete" — only an attachment is, per captureCalculations.ts).
-- Reconciling a vendor-less or tenant-paid receipt had nothing valid to
-- put in the required, vendor-only column.
--
-- Confirmed with the user rather than blocking those receipts from ever
-- bridging: make vendor_id nullable, and add tenant_id/
-- prospective_tenant_id alongside it, exact mirror of capture_log's own
-- paid_to_vendor_id/paid_to_tenant_id/paid_to_prospective_tenant_id
-- three-way design (20260921200000) including its mutual-exclusivity
-- constraint. The bridge populates whichever one matches the capture
-- entry's own paid_to_* selection, or leaves all three null if nothing
-- was selected there.
--
-- Manually-entered transactions via TransactionForm are unaffected —
-- that form's own Vendor field keeps its required-field enforcement
-- (asterisk + disabled-button guard) unchanged; only the auto-bridge can
-- produce a transaction with a null vendor_id or a tenant/prospective-
-- tenant payer today.
alter table financial_transactions alter column vendor_id drop not null;
alter table financial_transactions add column tenant_id uuid references tenants(id) on delete set null;
alter table financial_transactions add column prospective_tenant_id uuid references prospective_tenants(id) on delete set null;

alter table financial_transactions add constraint financial_transactions_payer_single_entity
  check (
    (vendor_id is not null)::int
    + (tenant_id is not null)::int
    + (prospective_tenant_id is not null)::int <= 1
  );
