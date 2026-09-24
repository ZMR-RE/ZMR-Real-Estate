# Batch O — Insurance box requirements for review

Status: O1–O7 APPROVED. Evidence: owner said “Approve bath o” alongside the cb9b988 terminal checkpoint. Queued requirements, not implemented. No code, migration or live record changes from this approval.

## Verified existing implementation
Inspected InsuranceLedger, InsuranceLedgerList, InsurancePolicyForm, insuranceQueries. Existing property-specific ledger permits multiple dated policy records with provider (required), policy number, named insured text, start/end dates, premium, dollar deductible, representative name/phone/email, payment-plan pick list, discounts and multiple Documents attachments. It uses existing EditableSection and grouped policy cards. The legacy contact_info column is still selected but not shown. Preserve all values and IDs, including legacy contact text; do not discard or guess contact mappings.

Current status uses only expiration date and marks missing expiration Active. Future effective dates are ignored. Status compares UTC date while countdown uses local calendar date. Missing expiration receives a success urgency. Documents display generic numbered labels. Current premium has no explicit amount basis; do not infer annual/term/monthly from payment-plan text. These are implementation facts, not live coverage assessments.

## O1 — Preserve visual character and improve scanning
Keep Insurance in Overview, using the established navy/white design tokens, grouped policy cards, typography, meaningful expiration cues, hover feedback and section Edit → Save/Cancel. Summary for each policy: provider, policy type if known, policy number if supplied, recorded term/date status, expiration and clearly labeled premium basis. Expand for full information; empty optional fields hidden in view and available in Edit. Keep prior policy terms accessible without allowing them to swamp current records. Do not replace the Overview layout or hero. Future preview must show this box in its actual page context.

## O2 — Identification and coverage details
Preserve current identity fields; add optional Policy type via account pick list and optional Notes. Keep provider the only required business field to save a policy draft. Preserve named-insured wording exactly as entered; optionally link multiple actual people/entities without overwriting policy wording or inferring insured status from property ownership. Optional repeatable coverage rows: coverage label, limit amount, deductible amount OR percentage, deductible basis/notes. Legacy deductible remains labeled Existing policy deductible until user deliberately refines it; never auto-assign it to every coverage. Currency/percentage values validate if present, blank is not zero. Coverage terminology/values come from user/policy documents; this feature gives no insurance advice or adequate-coverage certification.

## O3 — Cost and payment meaning
Keep existing premium field and values. Add explicit premium basis: Policy-term total, Installment, Other (description), Unknown. Existing values start unresolved/Unknown, not guessed. Payment plan remains separate and existing discounts retained. Payment handling optional: Direct, Mortgage escrow, Other, Unknown; optional explicit financial-account link uses approved account context. Do not multiply installment figures into annual expense, imply an amount has been paid, or post accounting from a policy save. Actual payments and escrow transactions belong in Financials/Mortgage.

## O4 — Contacts and supporting documents
Link reusable contacts for agent/broker/service/claims roles with multiple labeled phones/emails. Preserve current representative fields and legacy contact_info while providing explicit user reconciliation; don't merge by matching names. Preserve policy-specific contact/history context when shared contacts change. File labels and categories identify declarations, policy wording, endorsements, renewal/cancellation notices, certificates and invoices without mandatory uploads. Link existing files or upload once, retaining policy and explicit property/entity associations. No automatic ownership links, imported financial entries or inferred coverage. Use approved upload limits and actual hosted validation; failed file processing remains recoverable without duplicate policies.

## O5 — Honest dates, renewal and policy history
Display date-derived labels Upcoming term, Within recorded term, Term ended, Dates incomplete. These describe entered dates, not insurer-confirmed coverage. Both valid dates required for Within recorded term; missing dates never produce a green coverage assurance. End date before start rejected when both supplied; shared account/user calendar date used consistently. Cancellation/nonrenewal recorded explicitly with notice/status and effective date; never inferred from a missing renewal. Renew creates a new linked policy-term record; retain previous dates, cost, contacts/evidence. Optional copy of selected identity/contact/coverage details is visible for review; do not carry old dates/premium/verification forward as current facts. Editing a mistaken value differs from renewal. Archive mistakes with history; do not delete historical evidence or hide relevant cancellation.

## O6 — Renewal follow-up
Offer an opt-in Create renewal follow-up action routed to Action Queue. Suggest 30 days before recorded expiration, allow user-selected date and assignee. No date means no invented reminder. User explicitly saves work; no automatic email or policy renewal. Maintain one linked reminder for each selected policy term/purpose; retry does not duplicate. If expiration changes, show the existing task and offer explicit rescheduling; do not silently move assigned/completed work. Past suggested date requires user selection rather than creating a surprise overdue item. Reminder completion does not imply renewed insurance. Broader automation remains separately scoped.

## O7 — Shared policies and history
For policies covering several properties, recommend one policy/term record with explicit covered-property associations, visible from each relevant property; do not duplicate a blanket-policy premium and sum it per property. Label total policy cost as shared/unallocated until a separate approved bookkeeping allocation exists. Preserve all existing property-specific policy IDs and document links through an additive association model; migration requires a concrete reviewed mapping, no inferred sharing based on number/provider. Links must remain account-scoped.

History exposes who changed policy fields, associations, renewal/cancellation data and documents, with previous/new values and real recorded dates. Show Updated on separately from effective/expiration/document dates. No invented historic events or coverage verification. Implement approved M presentation for this named insurance scope if O7 approved; do not claim M alone already authorized insurance expansion.

## Acceptance checks to include in eventual bounded handoff
1. Existing policies, legacy contact values, IDs and files survive unchanged; old premium/deductible meaning remains unresolved where ambiguous.
2. Draft with only provider saves; unknown dates do not show Active/green coverage assurance. Future, today-ending, ended, invalid-range and cancelled terms have deterministic labels/countdowns.
3. Multiple concurrent policy types are supported. Renewing one preserves previous term/evidence and does not change another policy.
4. Dollar, percentage, unknown and zero values display correctly; no accounting entries or calculated annual totals created.
5. Reusable contacts and named insured links preserve policy text and user choices; editing a contact does not rewrite historical policy facts.
6. One shared policy appears at selected properties with same ID; premium is not counted once per property in portfolio totals. No cross-account links.
7. Existing file linking avoids reupload; repeat/failed save never duplicates policy or successful files.
8. Explicit renewal follow-up is traceable and duplicate-safe; date changes require user choice, completion does not assert renewal.
9. View/Edit, mobile, keyboard, archive/history and empty states use established components; no generic replacement of the property-page personality.

Scope boundary: claims management, automated insurer verification, coverage recommendations, automatic renewal/email and premium accounting allocation are not part of this proposal. Technical architecture details and Excel column mapping must be reconciled before declaring implementation ready.
