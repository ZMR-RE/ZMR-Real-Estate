-- Package 1 (§3, contract v3) — a nullable marker for when a property's
-- legacy owner_name/contact_phone/contact_email values were explicitly
-- reconciled into the real contacts system via "Review saved contact
-- details." Null means "not reconciled yet" (the default, and the state
-- of every existing property); it is set only by that explicit action,
-- never inferred, backfilled, or defaulted from the presence/absence of
-- the legacy fields themselves. The legacy fields are never cleared by
-- reconciliation (CLAUDE.md's Data integrity rule) — this column only
-- records that a human looked at them and made an explicit choice.
alter table properties
  add column legacy_contact_reconciled_at timestamptz;

comment on column properties.legacy_contact_reconciled_at is
  'Set only by the explicit "Review saved contact details" action. Null = not yet reconciled. Never inferred or backfilled.';
