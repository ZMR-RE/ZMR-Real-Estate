# ZMR Real Estate — Build Roadmap

**ZMR Real Estate** = your account name inside the platform (account #1 of what will eventually be a multi-tenant SaaS).
**Platform/SaaS name** = TBD — not a blocker, resolve before Phase 5.

Numbering: phases are whole numbers (0, 1, 2...). Items within a phase are decimals (1.1, 1.2...). New items get appended as the next decimal in their phase, or as a new sub-item (e.g., 2.6) if discovered mid-phase — never renumber existing items. Check items off, don't delete them, so the count reflects real progress.

---

## 0. Foundation (prerequisites — nothing else starts until these are done)
- [ ] 0.1 Confirm platform/SaaS name + verify domain and trademark availability (non-blocking for engineering — can run in parallel/background)
- [x] 0.2 Provision GitHub repo + Supabase project + Netlify site — separate from the My Earth Market stack
- [x] 0.3 Design multi-tenant schema: `accounts`, `users`, `properties` tables + row-level security scoping every table to `account_id`
- [x] 0.4 Write CLAUDE.md build rules for this repo (session management, inspect-first methodology — adapted from the My Earth Market pattern)

## 1. Phase 1 — Core Foundation (single-threaded build; schema not stable enough yet for parallel terminals)
- [x] 1.1 Auth + account scaffolding — ZMR Real Estate created as the first account
- [ ] 1.2 Property Registry — property record, LLC, unit config, lease terms, utilities, insurance (5336 W Foster Ave, 2169 Ash St) — PARTIAL: property record/LLC/unit config/insurance are live and editable (verified); lease_terms and utilities exist only as unused jsonb columns with no UI anywhere, not started
- [x] 1.3 Quick Capture Inbox — mobile entry flow: Receipt / Visit / Communication (button selector — fixed set of 3), property (searchable/type-ahead dropdown — scales past 10+ properties), date (defaults today, editable), photo AND PDF attachment. Files stage in Supabase Storage on capture so it always works, even before Drive integration exists.
- [x] 1.4 Reconciliation Queue — unreconciled items view, manual triage
- [x] 1.5 Revert nav label and screen heading from "Log it" back to
      "Quick capture" (sentence case)
- [x] 1.6 Make capture-type selection mandatory before other fields
      appear; add Mileage as a 4th type alongside Receipt/Visit/
      Communication, each showing only its relevant fields — consolidated
      into the existing Mileage Log mechanism (roadmap 9.10) rather than
      running two parallel mileage entry points; standalone Mileage Log
      form retired, Financials' mileage rollup repointed at capture_log
- [x] 1.7 All type-relevant fields available and fillable at capture
      time. Attachment is optional. Only type, property, and date are
      required to save. CORRECTED — originally checked off without the
      actual per-type fields existing (every type but Mileage rendered
      the same generic Property/Date/Notes/Attachments set). Now built:
      Receipt gets vendor (text), amount (currency), category (reuses
      the existing 'subcategory' pick list from Financials/8.1); Visit
      gets an optional "who was met with" (text) alongside its existing
      notes; Communication gets contact name (text), method (new
      'contact_method' pick list, seeded phone/email/text/in-person),
      and subject (text). All new fields optional per this item's own
      rule — live-verified saving with only type/property/date still
      works and shows "Needs details."
- [x] 1.8 Support up to 25 attachments per capture entry — cap enforced
      in code (useCaptureForm.ts, captureActions.ts); live-tested with
      1-2 files, not literally 25, so re-verify under real load if issues
      surface
- [x] 1.9 Add delete/void action for a staged (not-yet-reconciled)
      capture entry
- [x] 1.10 Quick Capture's "Recently logged" view and Reconciliation
      (Action Queue) read from one shared underlying data source — no
      duplicate storage, per the new Single source of truth rule
- [x] 1.11 Two independent status indicators per entry: Complete/Needs
      details (green highlight when complete, filterable) and
      Reconciled/Not reconciled — displayed separately. "Mark complete"
      manual override and any remaining-field completion happens in
      Recently logged/Reconciliation, never in Quick Capture itself.
      An item cannot be marked Reconciled while still Needs details,
      except via the explicit manual-complete override.
- [x] 1.12 Add an in-app light/dark mode toggle (in Settings) so the
      user isn't dependent on OS-level preference to preview both modes
      — Settings > Appearance (Match device/Light/Dark), applied before
      first paint, persisted to localStorage. Surfaced a real bug while
      verifying live: the sidebar's "Settings" link was invisible in
      light mode (navy text on matching navy background) since it had
      never been reachable without an OS-level change before — fixed
      alongside this item
- [x] 1.13 Fix type-selector button shape inconsistency: selected state
      must change color/fill only, never change from rounded-square to
      circular
- [x] 1.14 Convert Quick Capture into two tabs at the top of the screen:
      "Capture" (the entry form) and "History" (the current "Recently
      logged" section) — remove the long vertical scroll-to-reach pattern
- [x] 1.15 Rebuild "History" (formerly Recently logged) as a real table:
      columns for type, property, date, and both status indicators
      (Complete/Needs details, Reconciled/Not reconciled), filterable by
      type — not the current unstructured list
- [x] 1.16 Receipt: add Unit (optional, shown only if property has
      units), Payment method, Repair vs. Improvement (optional dropdown).
      Reorder Receipt's fields to: Property, Unit, Date, Vendor, Amount,
      Category, Payment method, Repair/Improvement, Notes, Attachments.
      New capture_log columns: unit_id (real FK to units, on delete set
      null — not free text like financial_transactions.unit, since Quick
      Capture already links Property for real and Unit deserves the same
      treatment), repair_or_improvement (fixed 2-value check constraint,
      matching financial_transactions' identical column exactly rather
      than a new pick list — flagged in
      shared/pickLists/pickListsQueries.ts's PickListName comment as a
      deliberate exception to the new Pick-list-first rule, so the two
      stay in lockstep for whatever a reconciled entry becomes). Unit
      options are fetched reactively keyed on whichever property is
      selected (both in the create form and, per-row, in the Recently
      logged/Reconciliation detail form, since every row's entry has a
      different fixed property there).

      Payment method CORRECTED before this item was reviewed: originally
      built as a flat reuse of Financials' 'payment_method' pick list per
      this item's first wording, then redesigned per direct follow-up
      instruction into a two-step picker — pick the property's saved
      Financial account (7.18) first ("Chase checking ...4471"), then a
      secondary "how" selector (Debit card/Check/Zelle/ACH), so one
      account covers multiple payment methods instead of needing a
      duplicate near-identical account per method. New
      capture_log.financial_account_id (FK to property_financial_accounts,
      on delete set null); capture_log.payment_method (already added)
      now stores the "how" value, sourced from a new, separate
      'payment_how' pick list — deliberately not the shared
      'payment_method' list, which Financials' own TransactionForm still
      uses unrelated to this. The "how" selector only renders once a
      Financial account is chosen.

      Verified live: 2169 Ash St and 5336 W Foster Ave both correctly
      show no Unit field (zero units logged for either) at first; 5336 W
      Foster Ave's field order screenshotted top-to-bottom confirms
      exactly Property → Unit (optional) → Date → Vendor (optional) →
      Amount (optional) → Category (optional) → Payment method
      (optional) → Repair/Improvement (optional) → Notes (optional) →
      Attachments, matching this item's required order exactly; captured
      a full Receipt (Unit "Unit A", Vendor "ABC Roofing", Amount 250,
      Repair/Improvement "improvement") and confirmed those values
      round-tripped through History → Add details, then separately
      created a test Financial account via the Property Profile (the
      sanctioned UI path), confirmed it appears in Quick Capture's
      picker as "Chase checking ...4471" exactly matching the requested
      format, selected it, confirmed the "How" selector appeared with
      all 4 seeded values, selected "Debit card", captured, and
      confirmed both fields round-tripped through History → Add details;
      archived the test account afterward via the Property Profile's own
      Financial accounts admin view and confirmed it correctly
      disappeared from Quick Capture's picker; then deleted both test
      capture entries (my own session's data). Did not
      create a fresh Unit record purely to test the "hidden when zero
      units" edge case beyond what 2169 Ash St already demonstrated —
      units have no delete/archive path in this app, so that would have
      left permanent, unremovable test data; the positive-display path
      was instead verified using an existing real unit (5336 W Foster
      Ave's "Unit A").
- [x] 1.17 Vendor field must link to the real Vendors entity (8.3),
      not remain free text — dropdown with inline "+ Add vendor",
      matching the same pattern already used for Organization type.
      Add a Vendor management view in Settings (list, add, archive,
      restore) alongside the existing Organization types view. New
      capture_log.vendor_id (nullable, on delete set null — Vendor stays
      optional, unlike financial_transactions.vendor_id's NOT NULL),
      backfilled from the old free-text vendor column exactly like
      20260911140000_vendors_entity.sql backfilled
      financial_transactions.vendor_source, then that column dropped.
      New vendors.archived column (same pattern as llcs.archived);
      useVendors.ts's picker now filters archived out, useVendorsManagement.ts
      is the new admin hook (list all/add/archive/restore, no edit — this
      item's scope is list/add/archive/restore only, matching Organization
      type's list view before 8.2a added editing). VendorsSection.tsx
      added to Settings alongside OrganizationTypesSection. The
      SearchableSelect + inline VendorForm "+ Add vendor" picker (copied
      from TransactionForm.tsx's existing vendor field) now backs Vendor
      in both Quick Capture's create form and its Recently logged/
      Reconciliation detail-completion form — vendorOptions/onCreateVendor
      threaded down through CaptureInbox.tsx and
      ReconciliationQueue.tsx→useReconciliationQueue.ts. Verified live:
      Settings lists the 5 real existing vendors; archived/restored one
      round-tripped correctly; captured a Receipt with "Home Depot"
      selected, confirmed it round-tripped through History → Add details
      showing "Home Depot" pre-filled, then deleted that test entry;
      tested the inline "+ Add vendor" flow (created a test vendor,
      immediately available as selected) and archived that test vendor
      afterward since vendors have no hard-delete; confirmed Financials'
      existing vendor picker (same underlying useVendors hook) still
      shows exactly the 5 active vendors, correctly excluding the
      archived test one.
- [x] 1.18 Amount field: format/round to 2 decimal places (currency),
      reject more than 2 decimal digits of input. New shared
      src/shared/currencyInput.ts (sanitizeAmountInput truncates a 3rd
      decimal digit in real time as it's typed/pasted; formatAmountOnBlur
      rounds/pads to exactly 2 on blur; hasAtMostTwoDecimalPlaces is a
      submit-time guard, belt-and-suspenders alongside the real-time
      truncation), used by both Quick Capture's create form and its
      Recently logged/Reconciliation detail-completion form — the two
      places capture_log.amount can be edited. Kept the input as
      type="number" (it already was; this item doesn't ask to change it).
      Verified live: typing "12.999" character-by-character stopped at
      "12.99" (real-time truncation); typing "12.5" then clicking away
      real-user-blurred it to "12.50".
- [x] 1.19 Fix Category/Subcategory UI: replace the separate "Manage
      subcategories" button with the standard "Manage options" pattern
      used everywhere else in the app — same component, same
      interaction, no bespoke model for this one field. ALREADY
      SATISFIED, no code change — searched the codebase for a bespoke
      subcategory component (none exists: `find src -iname "*subcat*"`
      returns nothing) and confirmed Quick Capture's Category field
      already renders via the shared PickListSelect + ManageOptionsPanel
      component (listName="subcategory"), the exact same one every other
      pick-list field in the app uses (Payment methods, Contact methods,
      Settings' Pick lists section, etc.). "Manage subcategories" is
      just that shared component's generated label
      (`Manage ${title.toLowerCase()}`) for this list's title
      ("Subcategories") — not a separate, bespoke button. Verified live:
      opened it and confirmed the exact standard panel (add-new-value
      row, list with Archive/Restore per option, an archived "Plumbing"
      entry with a working Restore button).
- [x] 1.20 Add Visit type (pick-list): seed with Maintenance/Repair,
      Estimate/Quote, Inspection, Tenant meeting, Showing, Move-in/
      Move-out, Other. New capture_log.visit_type column (plain text,
      same pattern as contact_method); wired into both the Quick Capture
      create form and the Recently logged/Reconciliation detail-
      completion form via the standard PickListSelect. Verified live:
      all 7 seeded values present in the dropdown, captured a Visit
      entry with "Inspection" selected, confirmed it round-tripped
      through History → Add details showing "Inspection" pre-filled, and
      confirmed the list is manageable from Settings ("Manage visit
      types", all 7 values present, add/archive available). Test entry
      voided afterward (my own session's data).
- [x] 1.21 Mileage: add optional Start destination and End destination
      fields. When both are filled and miles are recorded, save this as
      a reusable named trip. Selecting a previously-used trip auto-fills
      its recorded mileage. Miles + description alone (no start/end)
      still counts as a complete, valid entry. New capture_log
      start_destination/end_destination columns and a new mileage_trips
      table (account_id/property_id scoped per explicit product decision
      — a route stays associated with the property it was logged
      against; unique on property+start+end so re-logging the same route
      updates its remembered mileage rather than duplicating). A "Use a
      previous trip" dropdown appears in the create form once the
      selected property has ≥1 saved trip; selecting one auto-fills
      start/end/miles (still editable after). The upsert also fires from
      the Recently logged/Reconciliation detail-completion path, not
      just at capture time. Untouched: captureCalculations.ts's
      completeness check already only requires miles_driven > 0, so this
      item's "miles + description alone still counts as complete" was
      already true and needed no change.

      Found and root-cause-fixed a real bug while verifying this live:
      selecting a saved trip repeatedly made Capture silently do nothing
      (no network request, no error shown, entryType/propertyId all
      looked correct — cost a long debugging detour before landing on
      the actual cause). PostgREST returns mileage_trips.miles as a
      genuine JS number in this context, not the string every other
      numeric(...) column in this schema is documented as returning;
      selectTrip passed that raw number into milesDriven state, and
      submit()'s `milesDriven.trim()` throws on a number, silently
      aborting the whole async submit with no network call and no
      surfaced error. Fixed at the data boundary (listMileageTrips now
      coerces miles to String(...) so MileageTrip.miles's type is
      actually true at runtime) rather than defensively patching every
      consumer. While tracing it, found the exact same class of bug
      already latent in captureQueries.ts, unrelated to anything built
      this session: capture_log.amount can come back the same way, so
      "Add details → don't touch Amount → Save details" silently no-
      opped whenever a receipt already had an amount set. Fixed
      alongside it — every capture_log read/write function now
      normalizes miles_driven/amount to strings before returning
      (captureQueries.ts's new normalizeCaptureEntry). Verified live
      after the fix: trip auto-fill → Capture → saved correctly, "Add
      details" on a receipt with an existing amount → Save details
      without touching Amount → saved correctly (previously silently
      failed). Two trips ("Home Office → 2169 Ash St", "Manual Start →
      Manual End") remain in the picker as leftover test artifacts —
      mileage_trips has no delete/admin UI (same limitation as Units,
      out of this item's scope), so they can't be cleaned up from the
      dashboard; harmless, but the account owner will see them.
- [x] 1.22 Verify Property field never shows an "add new" option inside
      Quick Capture — properties must only be addable via Property
      Registry, then appear automatically in every property picker.
      VERIFIED, no code change needed. CaptureForm.tsx's property
      SearchableSelect never passes the `onAddNew` prop, and
      SearchableSelect.tsx only ever renders its "+ Add new" menu item
      when `onAddNew` is provided (`{onAddNew && (...)}`) — structurally
      impossible for it to appear here, not just a visual coincidence.
      Confirmed live too: typing into the property field's search box
      listed only the two real properties (2169 Ash St, 5336 W Foster
      Ave), no add-new row.
- [x] 1.23 Verify Date field defaults to today's date on every new
      capture, remains freely editable. VERIFIED, no code change needed.
      useCaptureForm.ts initializes and resets `entryDate` via
      `todayDateString()`. Confirmed live: a fresh Receipt capture's
      Date field held 2026-09-21 (today), in a plain editable
      `<input type="date">`.
- [x] 1.24 Redesign History's filter bar: consolidate the current two
      dropdowns ("Type" and "Show") into one clear, non-overlapping
      filter. Show real column headers (Type / Property / Date /
      Complete / Reconciled) at all times, including the empty state
      ("Nothing logged yet") — so the screen's structure is visible
      before any data exists.
- [x] 1.25 Global required-field convention: remove "(optional)" text
      labels everywhere in Quick Capture. Only Type/Property/Date (the
      genuinely required fields) get a red asterisk (*) next to the
      label. Confirm Save is functionally blocked (not just visually
      hinted) when any required field is empty — test this explicitly,
      don't assume the disabled-button styling already enforces it.
      Scoped to Quick Capture only, per this item's own "everywhere in
      Quick Capture" wording — not a retroactive sweep of every
      `required` field elsewhere in the app (PropertyForm, Financials'
      TransactionForm, etc.), which weren't part of this request. New
      shared `.required-marker` CSS class (src/index.css, colored via
      the existing --danger token) plus a visible "Type" label added
      above the type-selector button group (it previously had no
      on-screen label at all, only an aria-label). Every "(optional)"
      suffix removed from CaptureForm.tsx's field labels (16 of them);
      CaptureEntryDetailsForm.tsx already had none. Verified live, three
      separate mechanisms since Type/Property/Date are each enforced
      differently: Type — structurally impossible to submit without
      (the whole form, including the Save button, doesn't render until
      a type is chosen); Property — confirmed the Save button's
      `disabled` reflects true with no property selected, and that
      clicking it anyway does nothing (no submission); Date — confirmed
      separately, since Save's own `disabled` prop does NOT check
      entryDate: cleared the date field, confirmed
      `validity.valid === false`, then clicked Save and confirmed the
      form stayed open (native HTML `required` constraint validation
      blocked the actual submission, not just a visual/JS check) —
      restored the date afterward. Also confirmed via computed style
      that `.required-marker` renders in the actual danger-red color
      (`rgb(181, 68, 47)`, matching --danger), not just presence of the
      character.
- [x] 1.26 Rename the "Capture" button to "Save" everywhere in Quick
      Capture. Only the create form's submit button said "Capture" (the
      "Capture"/"History" tab labels are a different UI element — a
      section name, not this action button — left unchanged since
      renaming a tab to "Save" wouldn't make sense). Verified live: the
      button now reads "Save" (and "Saving…" while submitting, unchanged).
- [x] 1.27 Add a consistent visual cue (chevron or search icon) to every
      interactive-selector field — both the Property search/type-ahead
      and standard pick-list dropdowns (Visit type, Category, etc.) —
      so both are visually recognizable as clickable selectors, even
      though their underlying widget differs (searchable for long lists
      like Property, plain dropdown for short fixed lists). Used the
      same chevron for both widget types rather than a different icon
      per type, for maximum consistency (this item's own wording allows
      either). Fixed at the two shared components (src/shared/
      SearchableSelect.tsx's input, and the global `select` rule in
      index.css that every PickListSelect/native <select> already
      inherits from) rather than a Quick-Capture-only treatment, so it's
      genuinely consistent everywhere in the app, not just here — native
      selects get `appearance: none` plus the same chevron
      background-image every browser/OS would otherwise render its own
      (inconsistent-looking) native arrow for. Verified live: chevron
      renders on Quick Capture's Property/Vendor/Payment-method
      SearchableSelect fields and its Category/Repair-Improvement native
      selects; also spot-checked History's Type/Show filters and
      Property Profile's edit form (State/Status/Organization type
      dropdowns) to confirm the shared-component change applied
      consistently app-wide with no layout breakage — no data changed on
      either check.
- [x] 1.28 Visit's "Who was met with" becomes a real entity picker
      instead of free text: searches both Vendors (8.3, account-wide)
      and Tenants (8.4, scoped to the selected property's current/past
      tenants), visually grouped by type. REVISED mid-build (no freeform
      fallback; third "Potential tenants" category added) — built to the
      revised spec: `SearchableSelect` fed a merged, grouped option list
      (Vendors / Tenants / Potential tenants — the last via a new
      `prospective_tenants` table, property-scoped, since a prospect has
      no lease to anchor them otherwise); no "Someone else" free-text
      escape hatch anywhere. A person not yet on file is added as a real
      record on the spot via two inline footer entries in the same
      dropdown — "+ Add new vendor" (reuses the existing VendorForm) and
      "+ Add potential tenant" (new minimal ProspectiveTenantForm, name
      only) — `SearchableSelect` extended with a second optional
      onAddNewSecondary/addNewSecondaryLabel pair to support both at
      once. Vendor also gained a persistent "Relationship" tag
      (vendor_relationship pick list: Used/Estimate obtained/
      Recommended/Do not use, seeded with those exact 4 values) and a
      persistent Notes field, both only reachable once VendorList grew
      an Edit action (previously add/archive/restore only) mirroring
      OrganizationTypeList's inline edit-row pattern. Backing schema:
      capture_log.met_with_vendor_id/met_with_tenant_id (both FK,
      mutually exclusive via a check constraint, widened to 3-way once
      met_with_prospective_tenant_id was added) — met_with (free text)
      stays only for pre-existing historical rows, never written by the
      UI again. Verified live: opened Visit on 5336 W Foster Ave,
      confirmed the dropdown grouped "Vendors"/"Tenants" correctly (a
      test tenant assignment created live via the property's own Units →
      Tenants → Assign tenant flow, since the account had zero tenants
      anywhere before this); selected the tenant, saved, reopened via
      History → Add details, confirmed it round-tripped correctly. Used
      "+ Add potential tenant" inline (typed a name, saved), confirmed it
      auto-selected and round-tripped the same way, then deleted that
      capture entry (session's own test data — capture_log has a delete
      path). Confirmed Receipt's own separate Vendor field (single
      "+ Add vendor", no secondary, no grouping) render unaffected by the
      SearchableSelect extension. Verified Vendor's new Relationship/
      Notes fields in Settings → Vendors: edited a pre-existing test
      vendor ("Test Tenant") to set both, confirmed they displayed in the
      table, then reverted just those two fields back to blank per the
      test-cleanup rule (a pre-existing record, edited not created).
      Left in place and flagged to the user: the live tenant assignment
      at 5336 W Foster Ave / Unit A (tenant "ZMR Session Test Tenant
      1.28") — Tenants has no end-tenancy/delete UI yet, same precedent
      as 1.21's mileage_trips rows.
- [x] 1.29 Confirm the new Visit type "Manage visit types" button uses
      the same corrected "Manage options" shared component from 1.19,
      not a bespoke duplicate — verify before committing. ALREADY
      SATISFIED, no code change — Visit type was built in 1.20 using
      `<PickListSelect listName="visit_type">`, the identical shared
      component every other pick list in the app uses (payment_how,
      contact_method, subcategory, etc.); "Manage visit types" is that
      component's generated ManageOptionsPanel label, not a separate
      implementation. Confirmed by source (CaptureForm.tsx) and by 1.20's
      own live verification, which opened it and confirmed the standard
      add/archive panel.
- [x] 1.30 Universal dropdown convention: every open-choice pick-list
      dropdown ends with an inline "+ Add new [X]" / "Manage [X]" option
      as its last entry (matching the existing Organization type/Vendor
      pattern) — never a separate adjacent button. Applied to the shared
      `PickListSelect` component itself (not a Visit-type-only bespoke
      change — CLAUDE.md's single-source-of-truth rule and the item's own
      "standard for all future pick-list fields" instruction both point
      the same direction): the dropdown's native `<select>` now ends with
      a sentinel `+ Manage [X]` option; choosing it opens the same
      `ManageOptionsPanel` (now controlled via isOpen/onClose instead of
      its own internal toggle button) without ever committing the
      sentinel as the field's real value — React's controlled-select
      reconciliation snaps the visible selection back to the real value
      automatically. `ManageOptionsPanel` stays backward compatible for
      its two standalone (no adjacent dropdown) uses — Settings' pick-list
      manager and Reconciliation Queue's document-type manager — via an
      optional isOpen/onClose pair: omitted, it falls back to its own
      internal toggle button exactly as before. Verified live on Visit
      type per the item's explicit scope (dropdown ends in
      "+ Manage visit types"; selecting it opened the panel with the
      select's own value staying blank, not snapping to the sentinel;
      panel's own "Done" closes it); since the shared component changed,
      also spot-checked Receipt's Category dropdown (ends in
      "+ Manage subcategories", same behavior) and confirmed both of
      ManageOptionsPanel's standalone uses (Settings' 13 pick-list
      toggles including the new Vendor relationships list, and
      Reconciliation Queue's Document types toggle) still open/close via
      their own button exactly as before — no regression.
- [x] 1.31 Add "Vendor type" pick-list field to Vendor (Store/Contractor/
      Service provider/Other). Rename Receipt's "Vendor" field label to
      "Paid to" and Visit's field label to "Met with" — same underlying
      Vendors+Tenants+Potential tenants picker, context-appropriate
      label. REVISED mid-build: Receipt's field label switches based on
      a new "Entry direction" toggle (Expense/Income) — "Paid to" for
      Expense, "Received from" for Income, defaulting to Expense.
      Receipt's field also upgraded from a Vendor-only picker to the
      exact same 3-way Vendors/Tenants/Potential-tenants picker Visit's
      "Met with" already uses (1.28), not just a label rename — a
      receipt can now be paid to (or received from) a tenant or
      potential tenant too (e.g. reimbursing a tenant, refunding a
      prospect's deposit). New vendors.vendor_type column + seeded
      pick-list values (20260921190000_vendor_type.sql), added to
      Settings' central pick-list manager (useSettingsPickLists.ts) and
      VendorForm/VendorList alongside the existing Relationship field.
      New capture_log.paid_to_vendor_id/paid_to_tenant_id/
      paid_to_prospective_tenant_id (mutually exclusive check
      constraint, mirroring met_with_*'s pattern exactly) —
      backfilled from the old vendor_id (1.17) which stays in the DB,
      unused, never dropped, per CLAUDE.md's no-drop-without-approval
      rule (20260921200000_capture_log_paid_to_entities.sql).

      Entry direction (new capture_log.entry_direction column,
      20260921210000_capture_log_entry_direction.sql) is deliberately
      narrow groundwork for roadmap 1.33, built only far enough to drive
      this label switch — a fixed 2-value field (not a pick list, same
      reasoning as repair_or_improvement), no default at the database
      level, defaulting to 'expense' in the UI only. 1.33 itself
      (Category dropdown filtering to Income vs. Expense categories
      based on this field) is NOT built here and remains a separate,
      open roadmap item — flagged rather than guessed at, since this
      session's scope was explicitly limited to the label-switch
      groundwork, not the filtering behavior.

      Verified live: added a real Vendor ("ABC Roofing", Vendor type
      "Contractor") via Settings, confirmed "Manage vendor types" lists
      all 4 seeded values (Store/Contractor/Service provider/Other);
      captured a Receipt on 2169 Ash St with Entry direction left at its
      "Expense" default, confirmed the field above it read "Paid to",
      selected "ABC Roofing" (correctly grouped under "Vendors" in the
      picker alongside the "+ Add new vendor"/"+ Add potential tenant"
      inline options), saved, then reopened via History → Add details
      and confirmed both Entry direction and the selected vendor
      round-tripped correctly. Separately toggled Entry direction to
      "Income" and confirmed the label switched to "Received from" live.
      Confirmed Visit's field now reads "Met with" (previously "Who was
      met with"). Verified in both light and dark mode and at mobile
      width (380px) with no layout breakage. Cleaned up afterward: the
      test capture entry was voided (own session's data), the test
      vendor was archived (vendors have no hard-delete).

      Follow-up — Cross-module data freshness fix (CLAUDE.md) applied to
      this picker: the "Paid to"/"Received from" Vendor/Tenant/
      Potential-tenant picker had the same stale-until-remount gap
      Financial account had before its own onOpen refresh, across all
      three of its sources (vendorOptions account-wide via useVendors,
      tenant/potential-tenant options property-scoped). Fixed in both
      the create form (useCaptureForm.ts's refreshPaidToOptions) and the
      "Add details" edit form (CaptureEntryDetailsForm.tsx's own
      refreshPaidToOptions, with vendorOptions' refresh threaded down
      from CaptureInbox/ReconciliationQueue via a new
      refreshVendorOptions prop). Visit's "Met with" picker shares the
      same underlying data but wasn't touched — out of this fix's scope.
      Verified live: opened the "Paid to" picker (empty), added a vendor
      via Financials' transaction form's inline "+ Add new vendor" in a
      second tab without reloading the first, reopened the still-mounted
      picker and confirmed the new vendor appeared and was selectable;
      repeated for the "Add details" edit form on a saved entry, where
      the already-selected vendor's name — previously blank because the
      row's own stale vendorOptions couldn't resolve its label — now
      resolved correctly once the picker's onOpen refresh ran. Test
      vendor and capture entry cleaned up afterward the same way as
      above.

      Follow-up — "Entry direction" renamed to "Receipt type", widened
      from 2 values to 3: Expense/Income/Refund-Return (new option
      value refund_return). "Paid to" now shows for Expense only;
      Income and Refund-Return both show "Received from" — Refund-Return
      wasn't given its own distinct label since none was specified and
      "money coming back" reads the same as Income from the field's
      perspective. capture_log.entry_direction renamed to receipt_type
      (20260922000000_capture_log_receipt_type.sql), a plain column
      rename (not add-new-keep-old) since no real user data existed
      under the old name yet.

      Confirmed with the user before building: Refund-Return's spec'd
      behavior ("computes as a REDUCTION to the original expense
      category's total, not an addition to Income — confirm this is
      reflected correctly in P&L") could not be verified, because
      capture_log and Financials' P&L (financial_transactions) are two
      disconnected tables today — reconciling a capture entry only sets
      reconciled: true, it never creates a financial_transactions row
      (that bridge is roadmap 9.9, unbuilt). Scope was confirmed as
      Quick-Capture-only: the rename/3rd-value is built, but it has no
      live effect on P&L, and none was claimed. Extending this to
      Financials' own entry_type (which does feed P&L) or building the
      9.9 bridge were both explicitly declined as out of scope for this
      round.

      Verified live: Receipt type shows all 3 options; selecting
      Refund/Return switches the label to "Received from" (confirmed via
      direct DOM check, not just visually); captured a real Receipt with
      Refund/Return selected, saved, reopened via History → Add details,
      confirmed receipt_type round-tripped as "refund_return" and the
      label rendered "Received from" on reload. Checked dark mode. Test
      entry deleted afterward (own session's data, no free-text field
      needed a ZMR-TEST- prefix since none was entered).

## 2. Phase 2 — Parallelized Build (5 terminals, once Phase 1 schema is locked and stable)
- [x] 2.1 Rent Ops — invoicing, receipts, on-time payment tracking
- [x] 2.2 Task Engine — per-property to-do lists, recurring items, "coming up" view across the portfolio. SUPERSEDED — migrated into the unified `action_items` table (10.2) and the standalone `tasks` table/Task Engine module dropped entirely (20260918100000/20260918100100); this item's functionality now lives at Action Queue (10.2/10.5), not a separate screen.
- [x] 2.3 Financials & Tax Readiness — income/expense by property and category, tax-ready export
- [ ] 2.4 Historical Data Backfill — import past bookkeeping/purchase dates for both properties — PARTIAL: purchase_date column added and backfilled via migration only, no UI ever displays or edits it; bookkeeping backfill not started
- [x] 2.5 Document Storage Architecture — native Supabase Storage: a `documents` table plus a private `documents` bucket, path convention `{account_id}/{property_id}/{category}/{filename}`, linked from each property's Documents tab
- [x] 2.6 Reconcile-to-Documents move action — on reconciliation, move the staged file from Quick Capture's staging bucket into its permanent Documents path above, and create its documents table record at that point — not before
- [x] 2.7 Documents section (Activity & Documents, applies uniformly to
      every property via the shared 2.5 architecture):
      1. Auto-generate the label for documents attached through the
         Property Tax Installment flow (9.5) — format: "Property tax
         [year] — [1st/2nd] installment". Manually uploaded documents
         elsewhere keep their own label/filename, unaffected.
      2. Add a search bar to filter the document list.
      3. Add pagination: view 25 or 50 documents at a time.
      4. Move the "Add document/link" button to the upper-right corner
         of the Documents box header.

      Item 1: `uploadTaxInstallmentDocument` (propertyTaxQueries.ts) now
      takes the installment's tax_year and writes
      `Property tax [year] — [1st/2nd] installment` as the document's
      label at insert time; a manual upload/link elsewhere
      (uploadPropertyDocument/createPropertyLink) is untouched, so its
      own label or blank "—" is unaffected. Not retroactive — the 4
      pre-existing tax documents on 2169 Ash St keep showing "—", by
      design (no backfill was asked for).

      Items 2-4: `PropertyProfileDocumentsTab` now owns its own
      CollapsibleSection (same refactor 7.23 did for Financial accounts)
      so "+ Add document or link" sits in the box's own header via the
      existing headerActions prop — upper-right, inline with the title,
      never a separate row. Search filters the already-fetched documents
      list client-side by label or category (no new query — matches how
      the rest of this list already works); pagination (25/50 per page,
      client-side slice) only renders its Previous/Next/Page-count
      controls when there's more than one page.

      Verified live on 2169 Ash St: uploaded a real file through the Add
      tax year form for a test year, confirmed the new Documents row
      read exactly "Property tax 1900 — 1st installment" while the 4
      pre-existing tax documents stayed "—"; searched "1900" and
      confirmed the list filtered to that one row; confirmed the
      "+ Add document or link" button renders in the Documents box's
      header row, not the body. Page-size selector (25/50) confirmed
      functional; the multi-page Previous/Next transition itself wasn't
      exercised live — this property only has 5 documents, and forcing a
      second page would have meant creating an excessive volume of
      throwaway test documents disproportionate to what's being checked
      (simple slice/ceil math already correctly gated on
      `pageCount > 1`, confirmed via the single-page case correctly
      hiding the controls). Test tax year/document removed afterward
      (own session's test data, storage file + documents row + the
      property_tax_installments row itself all deleted directly since
      this table has no delete/archive UI yet — same precedent as other
      tables in this position).

## 3. Phase 3 — Reuse & Integrations
- [ ] 3.1 Port Communication Hub from My Earth Market dashboard — adapt existing Gmail management code for per-property email accounts
- [ ] 3.2 Connect each property's dedicated email account into the hub
- [ ] 3.3 Command Center — property-scoped email management: add multiple email accounts, tag each to a property, foundation for an AI agent to eventually handle that property's tenant invoicing, receipts, and notifications through its own email
- [ ] 3.4 Configurable Document Routing Rules — account-level settings: define "this document type → this Drive folder → this naming pattern" (naming pattern supports placeholders like property/date/vendor/doc type). User-configurable per account, not hardcoded, so it works identically for future resale customers as it does for ZMR

## 4. Phase 4 — Intelligence Layer
- [ ] 4.1 AI reconciliation agent — auto-match captured items to the right property/expense/task
- [ ] 4.2 Performance Benchmarking — property income/ROI vs. market or national averages, keep-vs-sell signal
- [ ] 4.3 AI agent: automated invoice generation
- [ ] 4.4 AI agent: automated receipt generation and payment tracking
- [ ] 4.5 AI agent: bookkeeping automation (categorization, reconciliation matching)

## 5. Phase 5 — Productization (deferred until Phases 1–4 are proven on your own two properties)
- [ ] 5.1 Signup/onboarding flow for new customer accounts
- [ ] 5.2 Billing/subscription integration
- [ ] 5.3 "Blank template" account creation flow for new customers
- [ ] 5.4 Finalize platform branding + marketing site
- [ ] 5.5 Billing/subscription integration (Stripe or equivalent), enforcing the tier architecture reserved in 8.10
- [ ] 5.6 Terms of Service / Privacy Policy (legal requirement before handling other customers' financial and personal data)
- [ ] 5.7 Guided onboarding flow for a new blank-dashboard account (e.g. "add your first property" walkthrough)
- [ ] 5.8 Basic uptime/error monitoring
- [ ] 5.9 Internal admin console — view/manage all customer accounts,
      issue temporary passwords, CRM-style outreach tracking, ability to
      open/inspect a customer's dashboard for support purposes. Deferred
      until real customers exist.

## 6. Phase 6 — Analysis & Growth Tools
- [ ] 6.1 Research/prospecting tool — analyze properties not yet owned
- [x] 6.2 Mortgage payoff scenario calculator — model paying off a specific property's loan faster

## 7. Phase 7 — Entity Depth (Property & Mortgage Profiles)
- [x] 7.1 Property Profile page — tabbed detail view per property: Overview, Transactions, Activity Log, Documents
- [x] 7.2 Units as a real entity — a property can have multiple units, each with its own record (replaces the current free-text unit field). FIX: a unit's Tenants box's "+ Assign tenant" flow rendered the inline "+ Add new tenant" sub-form (its own "Add tenant" button) alongside the rest of the assignment form (Start date onward, a simultaneously-visible disabled "Assign tenant" button) — confusing, looked like two save actions with no explanation. Now clearly sequential: only the Tenant step shows until resolved. Also confirmed live (not a bug) that "Assign tenant" always correctly persisted to tenant_units — the "possibly not saving" report was explained by the UI confusion, not a data bug. Each unit's nested Leasing/Tenants/Utility-records sections (Specs moved to the consolidated property-level section, 7.4 revision) also got the 7.22 full-width-CollapsibleSection treatment, previously narrow/cramped unstyled divs.
- [x] 7.3 Leasing/Listing Tracker — per unit: platform posted to, date posted, days live, prospective tenant notes
- [x] 7.4 Property Specs/Measurements Log — key-value specs per unit (e.g. door dimensions) with last-updated timestamp — property-level scope built and verified live (per task scope, since 7.2 units don't exist yet); schema has a ready-but-unused unit_id column for per-unit scoping once 7.2 lands. REVISED — consolidated from a property-wide box plus a separate nested box per unit into one property-level "Specs & measurements" section: each row carries a Scope (Whole building or a specific unit, dynamically populated from Units, 7.2) and a new Area pick-list field (8.1 pattern, seeded Kitchen/Bathroom/Bedroom/Exterior/Other), with Scope/Area filter controls to narrow the combined list. No data migration needed — unit_id already encoded Scope. Verified live: added a unit-scoped spec, confirmed Scope/Area filtering narrows correctly; added a new unit while the Add-spec form was already open and confirmed it appeared as a Scope option immediately, with no reload (Cross-module data freshness rule).
- [x] 7.5 Move the existing per-property mortgage details, payment logging, and scenario calculator out of the standalone Mortgage Payoff screen and into a new "Mortgage" tab on the Property Profile (alongside Overview, Transactions, Activity Log, Documents) — reuse the existing mortgage_details/mortgage_payments logic and components rather than rebuilding them, same as how the Transactions tab reused Financials' query
- [x] 7.6 Repurpose the now-former standalone Mortgage Payoff nav item into a portfolio-wide view: total mortgage balance, total equity, and overall loan-to-value across all properties combined — a rollup, not a per-property editor
- [x] 7.7 Convert Property Profile's Overview tab (and the Mortgage tab's terms section) from always-editable to view-by-default with an explicit Edit action, per the new Data integrity rule
- [x] 7.8 Basic audit trail — track who changed a field and when, on Property, LLC, and Mortgage records. Directly useful once other people (or your future customers) are editing shared data, not just you
- [x] 7.9 Revise Property Profile tabs to: Overview, Financials, Mortgage, KPI, Activity & Documents (merged). REVERSED by 7.26 — Activity & Documents split back into two separate tabs.
- [x] 7.10 Overview tab: core fields always visible (address, LLC, status, market value, property facts, insurance section with coverage dates + attached document, contact email with "+ Add email" for multiple), plus collapsible boxes below: Tenants, Units (near bottom, reference-only). SEQUENCING NOTE: build the Units box first — it only depends on existing 7.2. Do NOT build the Tenants box until 8.4 (Tenant as a real linked entity) exists; building it against a placeholder first means rebuilding it once 8.4 lands. Interleave Phase 7 and Phase 8 execution accordingly even though item numbering stays as written. — PARTIAL GAPS: insurance is document-linked only (no coverage-date fields — not an existing schema field, not guessed at); contact email stays the single existing property field (no multi-email "+ Add email" array yet). Also relocated Property tax installments (9.5), Specs & measurements (7.4), and Security deposits into their own collapsible boxes on this tab, beyond the two boxes named in this item, since they were previously flat on Overview and had nowhere else to live.
- [x] 7.11 Units: building-level exterior specs (year built, roof, foundation, construction, # units) shown once; per-unit specs (floor, rooms, bed/bath, appliances) and per-unit status (rented/vacant-ready/renovating/listed); unit field labeled "Unit #" — verified existing 7.2/7.4 structure and adjusted (label wording) rather than rebuilding; now nested inside Overview's Units collapsible box per 7.10. REVISED per 7.4's consolidation — per-unit specs are no longer their own nested box under each unit card; they're rows in the one consolidated Specs & measurements section (Overview tab), scoped to that unit via the Scope field/filter.
- [x] 7.12 Utility records: linked to Property (building-level) or Unit (unit-level), each with type + responsibility (Owner/Tenant/Split) + notes — net-new module (utility_records table + utilities module); available at property level on Overview and per-unit inside each unit card.
- [x] 7.13 KPI tab: collapsible cards — Market & Financial Snapshot (Redfin/Zillow value + date, current loan balance, net equity, LTV, annual rent, YTD net cash flow, cash-on-cash ROI), Occupancy Snapshot, Follow-ups (pulls from Action Queue) — cash-on-cash ROI and market-value-as-of-date not shown (no field tracks total cash invested or a value-as-of date; card states "Not enough data yet" rather than guessing). Follow-ups is an explicit placeholder pending 10.2 (Action Queue unified data model), per this item's own "pulls from Action Queue" dependency.
- [x] 7.14 Activity & Documents tab: merged, collapsible boxes per category. REVERSED by 7.26 — split back into two separate tabs (Activity, Documents).
- [x] 7.15 Action Queue priority color system: red = overdue OR property status = Sold; yellow = due soon; default = normal. When a property's status changes to Sold, all of its open Action Queue items automatically turn red rather than requiring per-transaction-type logic. — built now that 10.2 (Action Queue unified data model) and 89e32bf ('sold' as a valid properties.status) are both live. Pure `actionItemPriority()` helper reads `item.property.status` straight off the item's live-joined property on every render — a real-time check, not a snapshot — so flipping a property to Sold turns all its open items red immediately, no per-item write or special-case trigger. "Due soon" = within 7 days (inclusive), a threshold chosen for this item since none was specified. Coloring applied once in the shared `ActionItemList` component, so both surfaces that render it (portfolio-wide Action Queue board and each property's KPI → Follow-ups card) pick it up automatically. Verified live: overdue item red, 10+ day-out item default, property flipped to Sold turned its open item red on both surfaces with no additional edit. This closes out Phase 7 (7.1–7.15), all complete.
- [x] 7.16 Move "Edit" action to the upper-right of the screen header,
      standard placement (was bottom of form)
- [x] 7.17 Freeform upload-or-link entry, not tied to any specific
      transaction or tax installment — extends the existing documents
      table (nullable storage_path/file_size, link_url/label columns,
      one-or-other check constraint). Originally built as its own
      "Documents & links" section on Property Overview, but that
      duplicated the Activity & Documents tab (7.14) and violated
      Single Source of Truth — corrected to remove the standalone
      Overview section and move the add-form directly into Activity &
      Documents' "Documents" box, which already showed the full,
      unfiltered list read-only; it now both displays and creates from
      one place. Also adds a third entry type, Google Drive folder
      (nullable link_type column, 'drive_folder' or null): same
      open-in-new-tab link mechanic as a plain reference link, but
      rendered as "Open in Drive" instead of "Open link" to keep it
      visibly distinct from a plain link or a file upload
- [x] 7.18 Financial accounts reference: bank account(s)/credit card(s)
      associated with a property — nickname + last 4 digits only, NEVER
      a full account/card number (hard rule, no exceptions) — enforced
      both in the form and by a DB check constraint on last_four; no
      column exists anywhere capable of holding a full number. FIX: 7.23's
      "Show archived" toggle moved from its own row inside the box body
      into the box's header row (right-aligned next to the title), so it
      no longer extends the box vertically just to be visible.
      CollapsibleSection gained an optional headerActions slot for this.
- [x] 7.19 Property value & rent value history: dated log entries per
      property (source, value, date) for market value — sources like
      Zillow/Redfin/other — replacing the single static market_value
      field. Same pattern for rent value (a market/asking-rent estimate,
      distinct from tenant_units.rent_amount's actual lease rent),
      tracked over time even while occupied. Manual entry only in this
      phase. New property_value_logs table (metric discriminator column
      rather than two near-identical tables) + property_latest_values
      view (latest non-voided entry per property/metric) feeding every
      former consumer of the dropped market_value column: Mortgage tab
      equity/LTV, Portfolio KPI rollup, Balance Sheet report. Surfaced on
      the Overview tab as an add-entry ledger (void, not edit/delete) and
      on the KPI tab's Market & Financial Snapshot card, which now also
      shows an as-of-date + source and a trend table — resolving 7.13's
      original "no value-as-of-date field" gap. Verified live: logged 2
      dated market-value entries, confirmed correct order/display on
      both the Overview ledger and KPI trend table, then voided both
      (test data, not real).
- [x] 7.20 Property Facts fields (structured): property type, purchase
      date, purchase method, property tax ID/PIN, county/township,
      square footage, lot size, zoning/use code — also finally gives
      purchase_date (added back in 2.4, never had a UI) its first field.
      FIX: county/township was one combined free-text field, but County
      and Township are different real-world values that shouldn't be
      forced into one — split into two distinct fields (`county`,
      `township`). Migration renamed the existing column to `county`
      (carrying every existing value forward as-is rather than guessing
      which of the two it represented) and added a new, separate
      `township` column.
- [x] 7.21 Structured fields for bedroom count, bathroom count, basement
      (yes/no or description), garage/parking spaces — building-level
      totals; per-unit bed/bath already covered by 7.11, this is the
      whole-building figure only
- [x] 7.22 Property information declutter: identity header (address
      large/prominent, city/state/zip subline, organization type, status
      badge) pulled out of the flat field grid; remaining fields grouped
      into labeled sub-sections (Insurance, Purchase & valuation,
      Physical facts); within each group, fields without a value collapse
      into a single "+ Add …" prompt instead of each showing "—",
      clicking it opens the edit form focused on that group's fields.
      Two fields the task didn't assign to a group were resolved with
      the user directly rather than guessed at: the legacy free-text
      "name" field (superseded by address, per shared/propertyLabel.ts)
      is dropped from this view entirely — still editable via the edit
      form, since its DB column is required — and contact email rides
      in the identity header as a minor secondary line rather than
      getting its own group. Insurance documents (not a PropertyForm
      field) stays a special case within the Insurance group: shown only
      when present, never contributing to that group's "+ Add" prompt.
      PropertyForm's field order was reshuffled to match the three new
      groups (pure reordering, no logic change) so a group's "+ Add"
      prompt lands the user on a contiguous run of that group's inputs,
      not scattered ones. Verified live: an existing mostly-empty
      property (5336 W Foster Ave) shows only its populated fields plus
      one "+ Add …" prompt per group, no wall of dashes; clicking a
      prompt enters edit mode with that exact field scrolled into view
      and focused (confirmed via document.activeElement); saving a value
      moved it out of the prompt into the real display (tested on
      Insurance policy number, then reverted — pre-existing record, only
      the one field edited back to blank, nothing deleted); the generic
      top-right "Edit property" button was confirmed to carry no stale
      focus target left over from an earlier "+ Add" click. Checked in
      both light and dark mode and at a simulated ~420px mobile width
      (iframe-based, since this session's resize_window tool doesn't
      affect this environment's viewport) — header wraps to a stacked
      layout, fields go single-column, no horizontal overflow.
- [x] 7.23 Financial accounts: archived accounts hidden by default,
      behind a "Show archived" toggle in the section header. EXTENDED —
      same toggle added to the Units box (gap T1 flagged: archived units
      previously rendered indefinitely with no way to hide them, part of
      why 3 stray test units went unnoticed earlier). UnitsSection now
      owns its own CollapsibleSection (was caller-wrapped before) so the
      toggle can sit in the header row, same pattern as
      FinancialAccountsSection.
- [x] 7.24 KPI tab: add a "Property taxes" card showing the
      tax-installment trend over time (year-over-year amounts), per
      9.5's original intent, now that real tax data exists in the
      account. New `usePropertyTaxTrend` hook reads the same
      property_tax_installments rows the Overview tab's ledger (9.5)
      already manages (no new table) — summed per year (installment 1 +
      installment 2) and compared to the prior year on file, both a
      dollar and percent change. Added as a 4th card on the per-property
      KPI tab (7.13's established home for this data — 9.5 named this
      exact destination, "feeds KPI tax-trend card", when it was first
      built). Verified live on 2169 Ash St, which has real multi-year
      tax data (2017-2025): card rendered all 9 years with correct
      year-over-year $ and % deltas (e.g. 2022's $785.48/+19.1% jump,
      2025's -$2,305.09/-45% drop reflecting its still-unrecorded 2nd
      installment) — no test data needed for this one, real data already
      existed.
- [x] 7.25 Convert Property Overview's boxes to the Box interaction
      standard's shared EditableSection component (src/shared/
      EditableSection.tsx, built by T2): Property information, Financial
      accounts, Insurance, Market & rent value history — one box at a
      time, each verified live before the next. Adding a new item
      (financial account, insurance policy, value entry) happens from
      inside Edit state, not a separate always-visible button.

      Property information: DONE. Removed the page-header "Edit
      property" button and the editingProperty state that used to live
      in usePropertyProfile.ts/PropertyProfile.tsx — the box now owns
      its own edit state via EditableSection, the only entry point into
      editing. Casualty of this, flagged rather than silently dropped:
      7.22's "+ Add …" field-group prompts used to jump straight into
      edit mode with that field focused (a second entry point into
      editing); PropertyFieldGroup's prompt is now plain inert text
      (still tells the user what's missing, no longer clickable) since
      EditableSection's `view` is a static ReactNode with no way to
      trigger its internal edit state from outside — the Box standard's
      "single Edit action, no exception" rule and EditableSection's
      deliberately closed API both point the same direction.
      PropertyForm's autoFocusFieldId plumbing removed as dead code
      alongside it. Verified live on 2169 Ash St: Edit opens the form,
      Cancel returns to view with original data intact, Save (tried with
      no changes, to exercise the round trip without touching real data)
      returns to view and re-renders correctly; confirmed no "Edit
      property" button remains in the page header. Checked dark mode and
      mobile width (380px).

      Financial accounts: DONE. FinancialAccountList gained a `readOnly`
      prop (used for the box's view state: plain labels, no Edit/Archive
      column) reused for the edit state's full interactive list too,
      rather than a separate duplicate table. The old always-visible
      "+ Add financial account" button below the list now only renders
      inside Edit state, alongside a "Done" button that returns to view
      (list-management boxes have no single "save," so Done just closes
      the management view — same role Cancel plays for a single-record
      form). "Show archived" stays a secondaryAction, visible regardless
      of view/edit state, unchanged from 7.23. Verified live on 2169 Ash
      St: view state shows the 1 active account with no action buttons;
      Edit reveals Edit/Archive per row plus "+ Add"/Done; added a real
      test account ("ZMR-TEST-Account"), confirmed it round-tripped
      (appeared in both edit and view lists), archived it via the UI,
      then hard-deleted the row directly (no hard-delete UI exists for
      this table) since archiving alone didn't match the exact pre-test
      state (1 active, 0 archived) — re-queried the DB afterward and
      confirmed it matches exactly, per the Cleanup self-verification
      rule. Checked dark mode and mobile width (380px, real iframe
      viewport, not just a cropped screenshot).

      Insurance: DONE. Same readOnly-prop pattern as Financial accounts
      — InsuranceLedgerList's per-row Edit column only renders when not
      readOnly. InsuranceLedger no longer wraps itself in a caller-owned
      CollapsibleSection (PropertyProfileOverviewTab.tsx dropped that
      wrapper, same as Financial accounts) since it now owns its own
      EditableSection box directly. "+ Add insurance policy" moved
      inside Edit state alongside "Done". Verified live on 2169 Ash St:
      view state shows the 1 real migrated policy ("Country Financial")
      read-only; Edit reveals per-row Edit plus "+ Add"/Done; added a
      real test policy ("ZMR-TEST-Insurance-Co"), confirmed it
      round-tripped in both edit and view lists, then hard-deleted it
      directly (same no-hard-delete-UI reasoning as Financial accounts)
      — re-queried the DB afterward and confirmed an exact match to the
      pre-test state (1 policy, the real one). Checked dark mode and
      mobile width (380px).

      Market & rent value history: DONE — all 4 boxes now converted.
      Same readOnly-prop pattern as the previous two, but at the
      PropertyValueHistorySection level rather than inside a single
      ledger — this box actually renders two independent logs (Market
      value, Market rent estimate) inside one EditableSection, both
      switching readOnly together. The old design was the worst
      violator of "view-only by default": each log's entry form
      rendered unconditionally, with no toggle at all, directly
      contradicting "never raw editable inputs shown by default" — now
      gone from view state entirely, only appearing inside Edit.

      Found and root-cause-fixed a real bug while verifying this live:
      saving a log entry (or voiding one) calls the parent's onChanged,
      wired all the way up to usePropertyProfile's refresh() — which
      used to set the page's shared `loading` flag on every call, not
      just the initial one. PropertyProfile.tsx's `if (loading) return
      <p>Loading…</p>` unconditionally swapped out the entire tree on
      any refresh, unmounting every EditableSection on the page and
      silently resetting all of them back to view state — so logging
      one entry, or voiding one, kicked the box straight out of Edit,
      discarding whatever was mid-typed in the other log's form.
      Root-cause fixed by gating that guard on `loading && !property`
      instead of `loading` alone — only the true first load (no
      property fetched yet) blocks the page now; a background refresh
      updates data in place. This bug wasn't new (the old design had no
      edit state to lose, so it was invisible before), but this
      conversion is what surfaced it, so it's fixed here rather than
      shipped alongside a regression.

      Verified live on 2169 Ash St: view state shows both logs
      read-only with no forms; Edit reveals both logs' full lists plus
      their "Log entry" forms and a "Done" button; logged a real test
      market-value entry, confirmed the box correctly stayed in Edit
      state afterward (the bug above, pre-fix, kicked it back to view
      here); logged a second test rent-value entry, same result;
      regression-checked Property information's Edit/Save round trip
      still works correctly after the shared loading-guard change; both
      test entries hard-deleted directly afterward (only "Void" exists
      in the UI, an intentional permanent audit-trail action, not a
      match for "restore the exact pre-test state") — re-queried the DB
      and confirmed zero entries remain, matching the pre-test state
      exactly. Checked dark mode and mobile width (380px).
- [x] 7.26 Split Activity & Documents back into two separate tabs,
      Activity and Documents — reverses 7.9/7.14's earlier merge. User
      has explicitly confirmed this reversal. Renamed/trimmed the old
      merged wrapper (PropertyProfileActivityDocumentsTab) to
      PropertyProfileActivityHistoryTab, now holding just Activity log +
      History (7.8). Documents (2.5) is its own tab, rendering
      PropertyProfileDocumentsTab directly since it already owns its own
      CollapsibleSection (2.7) and needs no wrapper. Verified live:
      "Activity" and "Documents" both render as separate tabs with the
      right content, nothing duplicated or dropped. (Note: this
      checkbox/verification note was itself lost once already to a
      shared-working-tree collision with another terminal's concurrent
      roadmap.md commit — re-added here after noticing the regression;
      the underlying code was never affected, only this documentation.)
- [x] 7.27 Dashboard-wide completion of the Box interaction standard on
      Property Overview (per the Standard rollout completeness rule —
      7.25 had converted 4 of the tab's boxes, leaving 6 unconverted and
      unlogged).

      1. Fixed EditableSection: collapse and edit had been built as
      separable (a plain div header, "this box is never collapsed"),
      which silently dropped every 7.25 box's chevron. Rewrote it to
      reuse CollapsibleSection's exact <details>/<summary> markup, so
      both work together — verified live that collapsing mid-edit
      preserves edit state (native <details> hides content without
      unmounting React children) on all 4 already-converted boxes.

      2. Converted the remaining 5 old-pattern boxes: Property tax
      installments, Specs & measurements, Utility records, Security
      deposits, Units — same readOnly-list-prop pattern as 7.25, "+ Add"
      folded into Edit state, chevron restored. Specs & measurements'
      Scope/Area filter bar moved to secondaryActions (a view concern,
      stays visible in both states, same treatment as "Show archived").
      UtilityRecordsSection now owns its own EditableSection box instead
      of being wrapped by its caller (same fix as Property tax
      installments), so its per-unit instance inside Units also got
      Edit/collapse for free without double-boxing. Units: "Show
      archived" stays secondaryActions; view state hides per-unit Edit/
      Archive and the standing "+ Add unit"; Edit reveals both plus each
      unit's inline edit form — nested Leasing/Tenants/Utility records
      subsections are unaffected, each already owns its own gate.

      3. Tenants box: since tenant assignment happens per-unit by
      design, it's no longer a dead end — always shows a "Manage tenants
      in Units ↓" link (empty/error/populated states alike) that
      auto-expands and scrolls to the Units box. EditableSection gained
      an optional `id` prop for this.

      4. Responsive 2-column box layout at desktop widths: Property
      information/Financial accounts/Insurance in one column, Market &
      rent value history/Property tax installments/Tenants in the other
      — each an independent vertical flex/grid stack, not a shared-row
      grid, so unequal heights between columns never force blank space
      into a box's own row (the problem the original full-width-only
      redesign existed to avoid). Specs & measurements, Utility records,
      Security deposits, and Units stay full-width below both columns.
      Single column under 900px (matches the existing .field-grid mobile
      breakpoint elsewhere on this tab).

      5. Verified every one of the 10 boxes on the tab individually
      (collapse/expand toggle, Edit reveals the correct interactive
      content, Cancel/Done returns to view-only) after all of the above
      landed together, not just at each box's own conversion time — this
      caught nothing broken, but was run specifically because two other
      terminals landed unrelated concurrent changes to shared files
      (index.css sticky-headers/overflow:clip, several *List.tsx table
      wrappers) during this work. Test data (a spec, a utility record, a
      security deposit + its transaction, a unit) created per box during
      verification was hard-deleted afterward (no delete UI exists for
      any of these); re-queried each table afterward and confirmed zero
      ZMR-TEST- rows remain anywhere touched.
- [ ] 7.28 Remaining old-pattern boxes found while completing 7.27, out
      of that item's scope (Property Overview only) — logged per the
      Standard rollout completeness rule rather than left unconverted
      and unlogged: LeasingListingSection ("Leasing / listing history",
      nested per-unit inside Units — standing "+ Add listing" button),
      TenantAssignmentsSection ("Tenants", nested per-unit inside Units —
      standing "+ Assign tenant" button), and
      PropertyProfileDocumentsTab.tsx (Documents tab — standing "+ Add
      document or link" button). PropertyProfileActivityHistoryTab.tsx
      and PropertyProfileKpiTab.tsx also use CollapsibleSection but have
      no add/edit action to gate (pure display/reporting), so they don't
      need this standard.
- [x] 7.29 Three dashboard-wide UI consistency fixes: (1) left sidebar
      (`.app-nav`) is `position: sticky` at desktop widths so it stays
      pinned in place while the main content area scrolls, extending
      the Sticky/frozen headers rule to navigation itself — mobile's
      existing horizontal top-bar layout is left unchanged (only a
      "left sidebar" exists at desktop widths); (2) Edit-mode form
      fields (input/select/textarea) were inheriting a smaller ambient
      font-size (14px, from the `td` context most inline-edit forms
      render inside per the app's table-based edit-row convention)
      instead of the app's normal 16px body text, making them harder to
      read while typing — the global input/select/textarea rule now
      pins font-size explicitly so every field renders at the same
      size regardless of its container; (3) Property Overview's
      collapsed "+ Add {missing fields}" hint (PropertyFieldGroup.tsx)
      was styled with a dashed underline that reads as a clickable
      hyperlink despite being plain, non-interactive text (per the Box
      interaction standard, editing has exactly one entry point — the
      box's own top-right Edit action) — restyled as a dashed-border
      pill/chip so it reads as a hint, not a broken link.
- [x] 7.30 Two fixes: (1) `.app-main`'s global content max-width was
      1180px, noticeably too narrow at normal laptop widths (leaves
      hundreds of px of unused gray space on a 1440-1920px viewport,
      once the 232px sidebar is accounted for) — widened to 1440px,
      the root-cause fix since every page shares this one cap, not a
      patch scoped to Overview alone; (2) Property information's
      purchase-price helper text ("Used for cost basis / depreciation…")
      was always-visible paragraph text — no info-icon/tooltip pattern
      existed anywhere in the app yet to "match", so this introduces
      the first one (`src/shared/InfoTooltip.tsx`, a small "?" icon
      with a hover/focus-shown bubble) and moves that field's helper
      text behind it.
      REVISION: this item originally also added a slim right-side
      "Snapshot" panel to Property Overview (estimated equity, next
      due Action Queue item, most recent Activity entry). User reviewed
      that direction and rejected it in favor of expanding a box to
      full width on click instead — removed entirely (PropertySnapshotPanel.tsx
      and its CSS deleted); the widened content area and the tooltip
      fix above are unaffected and stay.

## 8. Phase 8 — Pick-Lists & Linked Records
- [x] 8.1 Generic configurable pick-list system (account-level add/archive options) — apply to expense category/subcategory, payment method, document type, task type
- [x] 8.2 LLC / Ownership Entity as a real linked-record table, linked to Property (replaces current field) — the llcs table, properties.llc_id, and the real-list-plus-"+ Add new LLC" picker already existed (Phase 1); this pass added the missing formation_date field
- [x] 8.2a Rename "LLC" field to "Ownership entity"; rename
      "Individually owned / No LLC" to "Individual ownership"; rename
      "+ Add new LLC" to "+ Add ownership entity"; add edit and
      archive/delete actions for existing ownership-entity records
      (currently add-only) — the "Ownership entity" naming itself was
      superseded before ever shipping (8.2b landed the same session with
      the final "Organization type" name instead); the edit/archive/
      Individual-ownership-rename substance is built and live-verified
      (archive is soft, no hard delete — matches this app's archive
      pattern elsewhere; nothing else here hard-deletes either)
- [x] 8.2b Rename "LLC" field to "Organization type" (supersedes 8.2a's
      earlier naming — use this final name); "Individually owned / No
      LLC" becomes "Individual ownership"; add a "Holding company" view
      showing which LLCs a given Holding Company owns (data model
      already exists per 8.7, this adds the missing display)
- [x] 8.2c Organization type management view: from an Organization type
      (LLC) record, see all properties currently assigned to it, and
      reassign a property to a different Organization type directly from
      that view (not only via each property's own edit form). Multiple
      properties may share one Organization type.
- [x] 8.3 Vendor as a real linked-record table, linked to Transactions and Tasks
- [x] 8.4 Tenant as a real linked-record table, linked to Lease/Unit — built and live-verified by commit 2cf5aea (tenants/tenant_units tables, TenantAssignmentsSection, PropertyTenantsOverview); checkbox was left unchecked in that commit itself, caught by the 2026-09-16 structural audit
- [x] 8.5 Lease as a real linked-record entity, linked to Unit + Tenant (term dates, rent amount) — extended 8.4's tenant_units table (rent_amount, late_fee columns) rather than building a second table: 8.4's own migration comment already called out that tenant_units (one row per tenancy period, start/end dates) was built specifically to become the Lease record once rent/term fields were added, so a separate leases table would only have duplicated that linking
- [x] 8.6 Property address as the canonical identifier across the app (search, dropdowns, headers) — supersedes any name-based identification; 7.2's Unit display convention follows this ({address} — {unit label}) — PropertyProfile.tsx's `<h1>` now uses propertyLabel() (matches every other display site); the Reports module (reportsCalculations.ts's computeBalanceSheet, useReports.ts's propertyOptions) also converted and verified live — Balance Sheet rows and the Property filter dropdown show addresses. Both deferred items from the earlier partial pass are now resolved. Unit display: no cross-property unit listing exists yet to apply the {address} — {unit label} convention to; UnitsSection.tsx shows unit label alone since it's always nested under that property's own page already.
- [x] 8.7 Holding Company as a real linked entity: Holding Company → owns → LLC → owns → Property (not required data until formed)
- [x] 8.8 Vendor-level Split Rule: saved reimbursement percentage per vendor (e.g. pest control, 50/50); user must manually apply it per transaction every time — never auto-applied, no setting to change this
- [x] 8.9 Multi-user role-based access per account: architecture (users-to-account many-to-many with a role field) reserved now; permission UI and enforcement built later — satisfied by the existing `account_members` table (account_id/user_id/role, from Phase 0's initial schema); no new schema needed, role isn't read by any permission check yet
- [x] 8.10 Account `tier` field + per-feature tier-requirement flag reserved now on all accounts/modules; tier enforcement and tier definitions built in Phase 5
- [ ] 8.11 Contacts (extends Vendor, 8.3): notes and a reliability
      score/rating per vendor. Also brainstormed, to be finalized in
      full when this is actually built: (a) a comparison/estimate-
      tracking workflow — log multiple quotes for one job (e.g. 3 roof
      estimates), which one was chosen and why, tracked by date/job; (b)
      a future paid vendor-verification tier (e.g. a one-time $20-25 fee
      for a vendor to be listed as verified/trusted on the platform,
      for resale customers to draw from) — noted as a speculative future
      revenue idea, not yet scoped for build. Future consideration: a
      vendor verification/marketplace tier — once the platform has real
      users, offer contractors a one-time fee to be listed as
      verified/recommended, with cross-user ratings on price, speed,
      and quality. Valuable as a shared trusted-vendor list even
      without a fee, and a real differentiator versus competitors.
- [x] 8.12 Units and Tenants need the same Archive/Restore pattern
      already built for Financial accounts (7.18) and Organization types
      (8.2c) — currently no way to remove a Unit or Tenant record through
      the dashboard at all, forcing direct database cleanup every time
      test/incorrect data needs removing. Units: new `units.archived`
      column, `setUnitArchived`, Archive/Restore button + Active/Archived
      badge on each unit card (dimmed via the shared .row-voided class
      when archived, same as every other archived-row pattern in the
      app — never hard-deleted). Tenant: the dashboard's actual surface
      for a Tenant record is the per-unit assignment table
      (TenantAssignmentList.tsx), so archive/restore landed on
      `tenant_units.archived` (the assignment), not the `tenants` person
      table itself, which has no standalone admin list to archive from
      and stays selectable for future assignments regardless. Both
      property-scoped tenant reads (Overview's Tenants box via
      listCurrentTenantsForProperty, Quick Capture's "who was met with"
      via listAllTenantsForProperty) now exclude archived assignments.
      Archived-unit filtering also applied to the two picker consumers
      safe to touch without colliding with another terminal's in-progress
      edits (Action Queue's unit picker, the Occupancy Snapshot KPI);
      Quick Capture's own Unit picker (useCaptureForm.ts,
      CaptureEntryDetailsForm.tsx) was mid-edit by another terminal for
      unrelated work at build time — deliberately left untouched per the
      Parallel terminal safety rule, flagged as a follow-up once that
      terminal's work lands rather than risking a collision.

      Verified live on 5336 W Foster Ave / Unit A: archived the unit,
      confirmed the card dimmed and the badge/button flipped, restored
      it, confirmed it reverted cleanly (a pre-existing real record,
      only toggled — no delete needed, matching the archive/restore
      contract itself). Created a fresh test tenant + assignment
      ("ZMR Session Test Tenant 8.12"), archived it, confirmed the row
      dimmed with Status/Restore, and confirmed it disappeared from both
      the property Overview's Tenants box and Quick Capture Visit's "who
      was met with" picker — left archived (not hard-deleted) as the
      correct end state now that a real removal path exists. Also
      noticed and cleaned up, via direct DB action (own session's prior
      test data, no dashboard delete/archive path exists yet for that
      table — out of this item's scope to add one), two leftover
      `prospective_tenants` test rows from earlier in the session that
      had surfaced in the same "who was met with" picker.

## 9. Phase 9 — Bookkeeping Depth
- [x] 9.1 Chart of Accounts screen: preloaded with a standard rental real-estate chart of accounts, user-editable (add/remap accounts)
- [x] 9.2 Balance Sheet report (property value + cash − mortgage balance = equity), portfolio-wide or per-property — cash is a cash-basis running balance since inception (all-time income − expense − mortgage principal paid); no opening-balance data exists yet (see 9.18), so this assumes $0 at time zero, same simplification the rest of today's reporting makes
- [x] 9.3 Profit & Loss report (Schedule E format), portfolio-wide or per-property — every standard line shown even at $0; line labels come from each category's Chart of Accounts (9.1) mapping
- [x] 9.4 Cash Flow report — net income adjusted for non-cash depreciation (added back) and mortgage principal paid (a real cash outflow that isn't a P&L expense)
- [x] 9.5 Property Tax Installment ledger (year, 1st/2nd installment + date paid, attached document per bill) — feeds KPI tax-trend card. REVISED: "attached document per bill" widened to support multiple documents per installment slot (e.g. the original bill AND a separate payment confirmation), not one. property_tax_installments no longer holds document references itself — documents now point back at which installment/slot they belong to (documents.property_tax_installment_id/tax_installment_number), the same way documents already point at transaction_id/mortgage_id, so a slot can carry any number of them. The old installment_1_document_id/installment_2_document_id columns are kept, unused, never dropped. Confirmed tax documents correctly surface in Activity & Documents (2.5's shared architecture, no code change needed there — listDocuments already reads every document row for a property regardless of category, and uploadTaxInstallmentDocument already writes category='Tax Documents' + property_id correctly).
- [x] 9.6 Per-transaction document attachment field — upload, stored via the 2.5 document architecture
- [ ] 9.7 Monthly reconciliation checklist (recurring template in Action Queue): bank/CC statement reconciliation, rent received vs. invoiced, invoices sent, mortgage payment posted, security deposits reconciled, lease renewals approaching, insurance renewal approaching, tax installment due, year-end 1099 prep
- [ ] 9.8 Manual bank/credit card statement import (CSV upload + parsing + categorization) as the near-term alternative to live bank-feed sync
- [x] 9.9 Quick Capture → Financials bridge: reconciling a Receipt-type
      capture entry now creates a real financial_transactions row from
      its captured fields (vendor/tenant/prospective-tenant payer,
      amount, category, payment method, repair/improvement, property,
      date), linked back to the capture entry so either side can
      navigate to the other — closing the gap where a reconciled receipt
      previously had zero effect on P&L, Balance Sheet, or any report.
      REVISED SCOPE from this item's original wording ("linked to an
      existing transaction, imported or manual") to auto-creating a new
      transaction from the capture's own fields — confirmed with the
      user; the original wording no longer matched the feature this item
      had actually come to mean in practice (see 9.31's Refund-Return
      work, which already referred to this exact auto-creation concept
      as "the 9.9 bridge").

      Receipt-only, confirmed with the user: Visit/Communication/Mileage
      entries reconcile exactly as before, no transaction created.

      Three real schema gaps found and resolved, each confirmed with the
      user before building rather than defaulted/guessed around:
      - financial_transactions.amount required amount > 0. Refund-Return
        (reduces the original expense category's total, not an addition
        to Income) is implemented as a negative-amount transaction in
        that same expense category, netting out naturally in existing
        P&L sums with no special-case logic — required loosening the
        constraint to amount <> 0. TransactionForm's manual-entry input
        keeps min="0.01" unchanged; only the bridge can write negative.
      - financial_transactions.category (the required, Schedule-E-mapped
        top-level bucket) had no source in Quick Capture — the existing
        Receipt "Category" field is actually a subcategory value (reuses
        the 'subcategory' pick list). Added a real second field,
        capture_log.transaction_category, to Quick Capture's Receipt
        flow (both CaptureForm.tsx and CaptureEntryDetailsForm.tsx),
        storing the same fixed Category vocabulary financial_transactions
        already uses — no new categories, no Chart of Accounts changes.
        The pre-existing field's UI label was corrected from "Category"
        to "Subcategory" to match what it always actually meant. Required
        before a Receipt can be reconciled (not before it can be saved,
        matching every other Receipt field's roadmap-1.7 progressive-
        completion convention), for all three receipt types — Income
        included, since financial_transactions.category is NOT NULL
        regardless of entry_type.
      - financial_transactions.vendor_id was required and vendor-only,
        but a Receipt's "Paid to/Received from" can already be a vendor,
        tenant, prospective tenant, or nothing at all. Made vendor_id
        nullable and added tenant_id/prospective_tenant_id alongside it
        (exact mirror of capture_log's own three-way paid_to_* design,
        including its mutual-exclusivity constraint) — the bridge
        populates whichever one matches the capture entry, or leaves all
        three null. Manual entry via TransactionForm is unaffected: its
        Vendor field keeps its required-field enforcement unchanged.

      Also required amount/payment method to be present before a Receipt
      reconciles (previously only "has an attachment" gated it) — a real
      transaction can't be created without them.

      Verified live end-to-end (dev server): (1) a real Expense receipt
      with category, vendor, and amount — reconciled, confirmed a
      correctly-categorized, correctly-vendored transaction in Financials
      affecting P&L and the by-property-and-category summary; (2) a
      Refund-Return receipt — confirmed it reduced the same expense
      category's P&L total by exactly its amount, no special-case
      handling needed; (3) a receipt with no "Paid to" selected —
      confirmed it reconciled cleanly into a transaction with a null
      vendor_id, no error. Both navigation directions confirmed
      (capture entry → "View transaction" link; transaction →
      "(from Quick Capture)" link). Test data (one capture entry per
      scenario, one test vendor, their resulting transactions) created
      and deleted via a scoped, user-approved database script after
      verification — the dashboard has no delete UI for these entities
      yet. Typecheck and production build both pass clean.

      Flagged, not fixed in this pass: CaptureForm.tsx (525 lines),
      CaptureEntryDetailsForm.tsx (614 lines), and useCaptureForm.ts
      (551 lines) were already over the 300-line file-size-discipline
      threshold before this item and grew further from the new Category
      field — worth a structural split (e.g. per-entry-type
      subcomponents) as follow-up, deferred here to avoid compounding an
      already-large change with a hasty refactor.
- [x] 9.10 Mileage log: quick-entry in Log It, tied to a specific property; rollup summary surfaced in Financials for tax purposes
- [x] 9.11 Export function (PDF/CSV) for any report, for sending to an accountant — PARTIAL scope per approval: Financials' transaction list and Chart of Accounts covered; other report/list views can adopt the same shared exporter (src/shared/exporting/tableExport.ts) as they come up
- [ ] 9.12 QuickBooks/Xero-compatible export format, in addition to Schedule E native reporting (9.3)
- [x] 9.13 Security deposit tracking: dedicated Liability account (not Income); explicit transactions for deposit received, deposit returned, and deposit applied to damages, each clearing the liability correctly
- [x] 9.14 Mortgage escrow tracking: where a mortgage escrows property tax/insurance, track that escrow balance separately from principal/interest so it isn't double-counted or missing from the property tax ledger (9.5) or loan-balance KPI
- [x] 9.15 Depreciation / cost basis tracking: track each property's cost basis (purchase price + capital improvements, distinct from repairs per the existing repair-vs-improvement field) and calculate annual depreciation (standard 27.5-year straight-line for residential) for Schedule E accuracy
- [x] 9.16 Real bank reconciliation tool: match a starting balance + transactions to an ending statement balance and surface discrepancies — not just a checklist reminder (9.7), an actual matching mechanism
- [x] 9.17 Extend the audit trail (7.8) to financial transactions: who edited or voided a booked transaction and when
- [ ] 9.18 Historical Data Backfill (2.4) must establish real opening balances per Chart of Accounts account as of the backfill date, so the Balance Sheet (9.2) is accurate for periods before backfill
- [x] 9.19 Year-end closing/lock: ability to lock a financial period after it's been handed to an accountant; reopening a locked period is an explicit action, logged in the audit trail (9.17)
- [x] 9.20 Add soft-delete/void support to Mortgage records, matching the existing pattern used for financial transactions and Chart of Accounts entries — currently mortgage records can only be hard-deleted, which conflicts with CLAUDE.md's data-safety rule
- [x] 9.21 Property tax installment display: restructure each installment
      from one run-on inline line into a stacked block (Amount / Paid
      date / Documents), reducing visual clutter.
- [x] 9.22 Insurance as a historical ledger, replacing the single static
      Insurance block on the property record (properties.insurance_provider/
      insurance_policy_number, no dates, no coverage period, no premium,
      no multiple documents). New property_insurance_policies table:
      dated entries with provider, policy #, contact info, coverage
      start/end, premium amount, and multiple documents per entry — exact
      pattern of Property Tax Installments (9.5), including its
      multi-document design (documents point back at which policy entry
      they belong to via documents.property_insurance_policy_id, same as
      documents already point at property_tax_installment_id/
      transaction_id/mortgage_id). Unlike tax's two fixed slots per year,
      an insurance entry has just one set of documents, so no slot-number
      column was needed. properties.insurance_provider/
      insurance_policy_number are kept, unused, never dropped, per
      CLAUDE.md's no-drop-without-approval rule; each property's real
      existing values were carried forward as its first ledger entry
      (20260922020000_property_insurance_policies.sql) — not a guess,
      the account's own already-entered data relocated to its new home.
      Coverage dates/premium/contact info left blank on that carried-
      forward entry since this app never tracked them before.

      Verified live: 2169 Ash St's existing "Country Financial" /
      "P010766214" values correctly appeared as its first ledger entry
      after the migration ran. Added a test policy with a document
      upload, confirmed it saved and the document round-tripped (View
      document worked, correct storage path/category), confirmed editing
      an existing entry loads its values and existing documents
      correctly. Test policy, its document (DB row and storage file),
      hard-deleted afterward (own session's data, no real-world meaning).
- [ ] 9.23 Split CaptureForm.tsx, CaptureEntryDetailsForm.tsx, and
      useCaptureForm.ts (all now 500+ lines) into smaller, per-type-
      concern files, per the File size discipline rule — flagged by T5
      during the 9.9 bridge build, not yet acted on.

## 10. Phase 10 — Navigation & Action Consolidation
- [x] 10.1 Rename left nav to: Properties, Log It, Action Queue, Financials & Tax, Command Center, Automations, Portfolio KPIs
- [x] 10.2 Action Queue: single task/action data model (property/unit/type/assignee/due date/recurring), collapsible boxes by type; same records surface filtered on each property's own Overview — no duplicate entry between portfolio-wide and per-property views — new `action_items` table (property_id/unit_id nullable, type reuses 8.1's task_type pick list, assignee is a plain user FK for now). Surfaces on the KPI tab's Follow-ups card (7.13's named candidate), not Overview — 7.13 built Follow-ups there specifically as this item's landing spot, and Overview has no equivalent placeholder; verified live, one row read by both the portfolio Action Queue and the property's own Follow-ups, no duplication. Mounted at the existing "Action Queue" nav destination (/reconciliation, ReconciliationQueue.tsx) rather than a new route, since wiring a new one would've required touching App.tsx/AppShell.tsx (both out of scope here) — that page now carries two distinct sections (Action Queue, Reconciliation) under one URL as a result. Existing Tasks (2.2) was NOT consolidated into this table as of this item's original completion — that migration (live task rows + dropping the old `tasks` table) needed its own explicit sign-off per CLAUDE.md and was deferred. STATUS UPDATE: that consolidation has since happened (20260918100000/20260918100100) — Tasks (2.2) is fully superseded, the `tasks` table and Task Engine module no longer exist.
- [ ] 10.3 Portfolio KPIs (nav item): portfolio-wide rollup — mortgage/equity/LTV (existing 7.6), performance vs. market (existing 4.2) — collapsible cards
- [ ] 10.4 Command Center: implement existing Phase 3 (3.1–3.4); elevate to a visible nav item as soon as Phase 3 is built, rather than remaining a designed-but-invisible phase
- [x] 10.5 Full Action Queue build (overhaul of 10.2's initial cut):
      two tabs ("To resolve" — all action items; "Automations" —
      placeholder for Phase 11's agent roster, not built yet); top
      summary strip (overdue / due this week / upcoming / automated
      counts, automated static at 0 for now); one filter row (Property,
      Type, Status open/completed, Assignee, search); flat list
      sortable/filterable by due date instead of collapsible boxes
      grouped by type (7.15's color-coded priority carries the
      urgency signal instead); completed items hidden by default behind
      the Status filter; clicking an item opens full detail
      (description, due date, property/unit, type, assignee, linked
      source if any, links, file attachments); recurring tasks gain a
      user-set "custom" interval option alongside the existing weekly/
      monthly/quarterly/yearly (still purely user-defined at creation
      time, no auto-generation from other modules); "+ New action"
      button top-right matching the established create-flow pattern
      (Property Registry's "+ Add property").

## 11. Phase 11 — Automations / Agent Roster
- [ ] 11.1 Automations nav section: agent-roster pattern adapted from My Earth Market's Operations Hub (named agent profiles, health-state, training/active/paused status, dependency on which module, audit log) — adapted for ZMR's multi-tenant/RLS model, not a direct copy-paste

## 12. Phase 12 — Settings & Account Administration
- [x] 12.1 Settings area (account-level, separate from main nav flow): houses Chart of Accounts management, pick-list management (8.1), security (2FA, password reset), and future billing/tier management — FOUNDATIONAL PASS per scope: `/settings` page built, linked from the account/profile menu, housing Chart of Accounts (moved out of Financials & Tax) and centralized pick-list management (8.1), verified live. Security (2FA, password reset) still lives in T4's separate "Account & Security" profile-menu panel (12.2) built before this page existed — T4 may want to move that panel's content into Settings now that it has a real home; billing/tier management still future work (Phase 5)
- [x] 12.2 Two-factor authentication + password reset flow
- [ ] 12.3 Optional Drive-backed document storage: account-level Settings toggle (default: platform storage) letting a customer choose to store a given property's documents in their own connected Google Drive instead — only available once that property's email/Drive is OAuth-connected via Command Center (3.2)
- [ ] 12.4 Consider consolidating Account & Security (12.2) into the Settings area (12.1) now that Settings has a real home — currently two separate menu entries; low priority, not urgent
- [x] 12.5 Installable web app — web app manifest (name, icons, theme color, start URL) plus an "Install app" section in Settings: a real button on Android/Chrome wired to the native `beforeinstallprompt` flow, and written step-by-step instructions for iPhone/Safari (Apple doesn't allow a triggered prompt). Icons are a plain "ZMR" monogram built from the existing design tokens only (--accent background, --bg glyph) — no new colors invented, and no prior app icon existed to coordinate with (the old public/favicon.svg is an unrelated leftover placeholder, untouched by this or the design-system pass). Verified live: Chrome recognized the manifest as installable (real `beforeinstallprompt` event captured, distinct from the generic-browser fallback message) and the Install app button correctly invoked the native prompt; the final accept/decline step is native OS browser chrome outside the reach of page automation, so that last sub-step relies on the API being correctly wired rather than an observed click-through. iOS instructions verified accurate against current Safari behavior and confirmed to render correctly by simulating an iPhone user agent.
- [ ] 12.6 Settings reorganization: convert from one long scrolling page
      into tabs — Bookkeeping (Chart of Accounts, Category mapping),
      Pick lists (grouped by domain: Financial — subcategories/payment
      methods; Property — property types/zoning/purchase methods/unit
      statuses; Operations — task types/document types/contact methods/
      listing platforms — not one flat list of 9+ buttons), Organizations
      (Organization types, Holding companies), Account & Security
      (Password, 2FA), Appearance & App (theme, Install app). Use
      responsive multi-column layout within each tab so wide screens
      aren't left with large empty gray space (same fix pattern as
      Property Overview's 7.22 grouping/space-utilization work).

## 13. Phase 13 — External AI Connector
- [ ] 13.1 Build a remote MCP server exposing scoped, read/write ZMR tools (e.g. get action queue, get portfolio KPIs, log a transaction) — each connecting user authenticated via OAuth 2.0, mapped to their own account_id, so they can only ever access their own data
- [ ] 13.2 Reuse the OAuth infrastructure built for Command Center (3.2) rather than building a separate auth layer — sequence this phase after Command Center is complete
- [ ] 13.3 Support both Claude (Claude.ai, Cowork, Claude Desktop) and ChatGPT as connecting clients, since both support the open MCP standard; note ChatGPT's write-access support varies by the customer's own ChatGPT plan tier, which is outside our control
- [ ] 13.4 Submit to Anthropic's MCP Connector Directory once stable, for discoverability (optional — the server works as a custom connector even before/without directory approval)

## Future Considerations (not yet phased — logged so they aren't lost)
- Online rent collection (actual ACH/card payment processing) — deferred; meaningful compliance/integration lift, revisit once there's a revenue model to absorb per-connection costs. Current payment methods: cash, check, Zelle.
- Live automated bank-feed sync (e.g. via Plaid) — deferred to a future paid tier once subscription revenue can absorb per-connection cost; manual CSV import (9.8) is the interim solution
- Tenant self-service portal (view lease, pay rent, submit maintenance requests) — real resale differentiator once Tenant/Lease entities (8.4/8.5) exist, but new UI surface, not a small add
- AI agent to automatically pull property market value and rent value from external sources (Zillow, Redfin, etc.) instead of manual entry — depends on 7.19 (the value history log) existing first
- Sale/Disposition report — computed automatically at time of property sale from existing purchase price, capital improvements, and depreciation data; capital gain is a sale-time calculation, not a Quick Capture category
- Real address autocomplete for Mileage's start/end fields (e.g. Google Places) — deferred to a future paid tier due to per-request API cost, same category as live bank-feed sync
- Document export/backup — let the user download all stored documents (e.g. as a zip) for their own backup, separate from 12.3's live Drive-routing option. Extends the existing data-export principle (11.2's Multi-tenant discipline rule: "every account must have a functioning data export path for its own data") to raw files, not just structured reports/CSVs

## Ongoing — Q&A / SOP Log
- [ ] A living reference section (in-app or a maintained doc) answering recurring "how do I do X" questions as they come up during real use (e.g. "how do I add past mortgage information"). Updated whenever a new section is built out or a real question arises — not a one-time deliverable, an evolving document.
