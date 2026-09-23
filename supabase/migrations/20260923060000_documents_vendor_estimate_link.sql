-- Roadmap 8.11(b) — a vendor estimate's supporting document (the actual
-- quote PDF/photo), same per-parent nullable-FK pattern documents
-- already uses for property_tax_installment_id/property_insurance_
-- policy_id/action_item_id — one document row can belong to at most one
-- of these parent types, distinguished by which FK is set.
alter table documents add column vendor_estimate_id uuid references vendor_estimates(id) on delete set null;
