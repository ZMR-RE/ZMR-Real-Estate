-- O1-A ownership foundation (Batch A/G/I) — generalized entity/individual
-- identity and tax-classification fields on the existing `llcs` table.
--
-- Extends `llcs` in place rather than creating a parallel table: preserves
-- every existing row's id, every existing FK (`properties.llc_id`,
-- `property_financial_accounts.llc_id`, `llcs.holding_company_id`) and
-- every existing consumer (useLlcs, useOrganizationTypes,
-- OrganizationTypeList, LlcForm) with zero change to any of them. See
-- docs/planning/ownership-property/O1-A-implementation-contract.md v3.0
-- section 2.1 for the full reasoning.
--
-- owner_kind is deliberately nullable with NO default, and every existing
-- row is therefore backfilled to null (unresolved), not asserted
-- 'entity'. An earlier draft of this work defaulted every existing row to
-- 'entity' on the reasoning that the current Add-property form has never
-- collected a person's name — the owner correctly rejected that as an
-- unverified assumption from a form's shape, not a confirmed legal fact
-- (CLAUDE.md's Data integrity rule: never seed/infer a field from a
-- naming pattern). The owner confirms each existing record's kind
-- explicitly, once, the next time it's opened.
alter table llcs add column owner_kind text
  check (owner_kind is null or owner_kind in ('individual', 'entity'));

alter table llcs add column display_name text;

-- Not previously modeled: every existing llcs row implicitly assumed
-- "LLC" as its legal structure (that was this table's whole premise
-- before this batch generalized it to cover individuals and other
-- entity types too). Fixed enum, not a pick list, despite CLAUDE.md's
-- pick-list-first default: legal_structure has fixed downstream meaning
-- (which federal_tax_treatment values are even coherent for a given
-- structure) the same reason financial_transactions.category is fixed
-- rather than account-editable — a display rename here must never
-- silently change what the value means to tax/accounting logic that may
-- read it in a later phase.
alter table llcs add column legal_structure text
  check (legal_structure is null or legal_structure in ('llc', 'corporation', 'partnership', 'trust', 'other', 'unknown'));

alter table llcs add column mailing_address text;
alter table llcs add column mailing_city text;
alter table llcs add column mailing_state text;
alter table llcs add column mailing_zip text;
alter table llcs add column notes text;

-- Tax classification (kept as flat columns on llcs, not a separate 1:1
-- table, specifically so every one of them is covered by the existing
-- generic audit trigger below with no new trigger code for these
-- particular columns — see the verification note at the bottom of this
-- file for what that claim does and does not mean in practice).
alter table llcs add column membership text
  check (membership is null or membership in ('single_member', 'multiple_members', 'unknown'));
alter table llcs add column federal_tax_treatment text
  check (federal_tax_treatment is null or federal_tax_treatment in ('unknown', 'disregarded_entity', 'partnership', 's_corporation', 'c_corporation', 'other'));
alter table llcs add column federal_tax_treatment_effective_date date;

-- Left null by default rather than defaulting to 'needs_review' — a
-- default of 'needs_review' would assert a review state that never
-- actually happened. Null means "no verification status recorded",
-- displayed as an omitted field per CLAUDE.md's empty-field rule, not as
-- a status badge reading "Needs review" for a record nobody has looked
-- at yet.
alter table llcs add column tax_verification_status text
  check (tax_verification_status is null or tax_verification_status in ('needs_review', 'user_verified'));
alter table llcs add column tax_verified_by uuid references auth.users(id);
alter table llcs add column tax_verified_at timestamptz;

alter table llcs add column last_verified_date date;
alter table llcs add column last_verified_by uuid references auth.users(id);

-- Audit coverage — stated precisely, not claimed as "automatic/free":
-- llcs already has llcs_audit_log (20260910271200_audit_trail.sql)
-- attached via `after update on llcs`, diffing every column in
-- to_jsonb(new) except skip_cols = ['id','account_id','created_at',
-- 'updated_at','property_id']. Every column added above is therefore
-- included in that diff purely because it's a plain column on a table
-- the trigger already covers — this is a true statement about existing,
-- already-shipped trigger code, verified by reading it, not by running
-- it in this migration. Confirm with a real UPDATE against a migrated
-- row (see the implementation contract's verification checklist) before
-- relying on it. Two real limitations, both true today and unrelated to
-- this migration: the trigger fires on UPDATE only (a new row's initial
-- values are never logged, only later changes to it), and it only
-- exists on properties/llcs/mortgage_details — none of the other new
-- tables in this batch (llc_tax_elections, contacts, contact_methods,
-- contact_links, property_ownership_interests, llc_membership_interests,
-- document_owner_links) get this trigger merely by being created near
-- it; each needs its own explicit attachment where that's warranted.
