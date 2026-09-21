-- Roadmap 8.12 — Units and the Tenant assignment (tenant_units) both
-- get the same Archive/Restore soft-delete pattern already used for
-- property_financial_accounts (7.18) and llcs (8.2c). Neither table had
-- any removal path before this — a wrong/test row could only be cleaned
-- up via direct database action, which CLAUDE.md's own rules treat as
-- an exception, not the normal path.
--
-- Tenant (the person, `tenants` table) is deliberately NOT touched here
-- — there's no standalone admin list for it to archive from; the actual
-- dashboard surface for "remove a Tenant record" is the per-unit
-- assignment table (TenantAssignmentList.tsx), which tenant_units'
-- new archived column now supports directly. A person stays selectable
-- for future assignments even after one of their past assignments is
-- archived.
alter table units add column archived boolean not null default false;
alter table tenant_units add column archived boolean not null default false;
