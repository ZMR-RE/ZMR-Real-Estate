# Existing behaviour: who can record payments (record only — no change proposed)

Recorded September 30, 2026 at the owner's instruction. This note keeps the existing behaviour on file, separate from the owner-only invoicing approval. It is **not** a proposal, and nothing here expands manager permissions or changes memberships.

## Current behaviour

- Payments are rows in `payments`, written through the Rent ops "Record payment" path (T2's rent-payment area).
- Any member of the account can insert them. Row-level security is `is_account_member`, so owner, manager and viewer roles are all allowed.
- Stage 1 adds exactly one rule to payments: a payment can only be recorded against an **issued** invoice (ZM316). It adds no role rule.
- The owner-only rule (ZM370, `20261002160000`) covers invoice actions and invoicing settings. It deliberately does **not** cover `payments`.

## Why it is recorded here

Payments count towards an invoice's remaining balance, and so towards an invoice's "Total outstanding". A non-owner recording a payment therefore changes what a later invoice shows. That is still existing behaviour, not something Stage 1 introduces.

Any future change to who may record payments belongs to T2's area and needs its own owner decision. None is requested here.
