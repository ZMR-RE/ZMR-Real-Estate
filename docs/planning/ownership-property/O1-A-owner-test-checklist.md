# O1-A — Owner test checklist (ownership, entities, contacts, stale-edit guard)

Version 1.0 · September 24, 2026 · Written at the close-out checkpoint after commit `cb9b988`. Companion to `O1-A-implementation-contract.md` v3.2.

Two separate checklists, with two very different meanings:

- **Checklist A — mock harness visual inspection.** Runs on your own machine against invented, in-memory data. It shows you what the new screens look like and how they behave, so you can give layout/wording/flow feedback early. It is **not** a test of your real portfolio, your real database, or Supabase. Nothing you do in it is saved anywhere.
- **Checklist B — real integration acceptance.** Runs against a real, isolated Supabase project that does **not exist yet** (see "Environment decision" at the end). Every step in B is marked **UNTESTED** — the expected behavior is written down so it can be checked later, not because it has been checked.

Status legend used below: **PASSED (terminal, mock)** = a terminal drove the real component code through this step in a browser against the mock harness; **OWNER — not yet done** = written for you, nobody has done it; **UNTESTED** = no execution of any kind yet.

---

## Checklist A — mock harness visual inspection

### A0. What the harness is, and is not

- The harness is a separate page (`harness.html`) served by a separate Vite config (`vite.harness.config.ts`) on its own port (**5180**). Your normal `npm run dev` app on port 5173 is untouched and keeps pointing at whatever it already points at.
- Inside the harness bundle, the Supabase client and the auth context are swapped for in-memory fakes (`src/devHarness/`). There is no Supabase URL and no key in this bundle — it **cannot** reach the live project, or any project, by construction.
- Every record you see is invented and prefixed **`ZMR-TEST-FIXTURE`** (e.g. "ZMR-TEST-FIXTURE Holdings LLC", "000 Fictional Test Way"). None of it is your portfolio. Nothing is related to any real property, entity, or contact.
- **Nothing persists.** Reloading the page resets every record to the fixture state. Anything you type is discarded.
- **Do not enter real business data into the harness.** It would be pointless (it is thrown away on reload) and it muddies the line between test and real. Use obviously fake values ("Test Owner C", "999 Example Rd").
- The page carries a permanent dark-blue banner at the top saying it is a mock harness. If you do not see that banner, you are not in the harness — stop.

### A1. Startup

1. Open a terminal in `/Users/janki/Projects/ZMR-Real-Estate`.
2. Run `npm run dev:harness`.
3. Open **http://localhost:5180/harness.html** in Chrome.
4. Confirm the banner: "MOCK DATA HARNESS — not connected to Supabase…"
5. Three view buttons sit under the banner: **Property Ownership section**, **Entity profile**, **Property information (stale-edit guard)**. Each is one slice of the real app rendered on its own.
6. When finished: press Ctrl+C in that terminal. Nothing needs cleaning up — there is no stored data.

### A2. Property Ownership box (view: "Property Ownership section")

This is the real `PropertyOwnershipInterestsSection` component — the same one that will appear on a property's Overview tab, directly after "Property information".

| # | Step | Expected | Status |
|---|---|---|---|
| A2.1 | Click **Property Ownership section**. | An "Ownership" box in view mode listing one owner, "ZMR-TEST-FIXTURE Owner A — 48%", with a status badge reading "Incomplete — more owners may still be added". | PASSED (terminal, mock) |
| A2.2 | Note there is no "Add owner" button outside the box; the only action is **Edit** in the box's top-right. | Matches the CLAUDE.md box standard. | OWNER — not yet done |
| A2.3 | Click **Edit**. | Owner A's percentage becomes an inline input with a **Remove** action; an "Add owner" picker; a checkbox "This is the complete ownership allocation (every owner listed, percentages totaling 100%)"; a **Reason** field marked required; **Save** / **Cancel**. | PASSED (terminal, mock) |
| A2.4 | Click **Save** with the reason blank. | Blocked with an inline message; nothing saved. | OWNER — not yet done |
| A2.5 | Use the picker to add "ZMR-TEST-FIXTURE Owner B" at 52%, leave the completeness checkbox **unchecked**, enter a reason, Save. | Returns to view mode: two owners, 48% and 52%, badge still "Incomplete" (completeness is never inferred from the numbers — only from your explicit checkbox). | OWNER — not yet done |
| A2.6 | Edit again, tick the completeness checkbox, enter a reason, Save. | Badge becomes green "Complete allocation". | PASSED (terminal, mock) |
| A2.7 | Edit again, change Owner B to 60% (total 108%), tick complete, Save. | Blocked with an inline error before any save (over 100%). | OWNER — not yet done |
| A2.8 | Edit, tick complete, but clear Owner B's percentage (leave it unknown), Save. | Blocked: a "complete" allocation requires every owner's percentage known and summing to exactly 100. | OWNER — not yet done |
| A2.9 | Edit, change something, then **Cancel**. | View mode shows the previous data untouched. | OWNER — not yet done |
| A2.10 | Reload the page. | Everything is back to the single 48% owner (proof that nothing persisted). | OWNER — not yet done |

### A3. Entity profile page (view: "Entity profile")

This is the real `EntityProfile` page, rendered for the fictional "ZMR-TEST-FIXTURE Holdings LLC". In the real app it is reached from Settings → Organization types → click the entity's name (route `/entities/<id>`), and there is deliberately no sidebar entry for it.

| # | Step | Expected | Status |
|---|---|---|---|
| A3.1 | Click **Entity profile**. | A breadcrumb, the entity name as the page heading, and a stack of boxes: Identity, Contacts, Linked properties, Tax classification, Membership, Documents, Financial accounts. | PASSED (terminal, mock) |
| A3.2 | Identity (view). | Shows only fields that have values (Owner/entity kind, Legal name, Legal structure, Formation jurisdiction) — blank fields (mailing address, EIN, notes…) are omitted, not shown as dashes. A "Mark verified" action is present. | PASSED (terminal, mock) |
| A3.3 | Identity → **Edit**. | Every field appears, including the blank ones. If "Owner / entity kind" were unconfirmed it would show an explicit "not yet confirmed" selector rather than a guessed value. Cancel returns to view. | OWNER — not yet done |
| A3.4 | Contacts (view). | One linked contact "ZMR-TEST-FIXTURE Contact Dana", role "Property manager", with one method: Work email `dana@fixture.example`, marked preferred. | PASSED (terminal, mock) |
| A3.5 | Contacts → **Edit** → "+ Add phone/email" on Dana; add a fake mobile phone with label "Mobile". | The contact now lists two methods; only one is marked preferred. | OWNER — not yet done |
| A3.6 | Contacts → **Edit** → "Link a contact": search finds nothing for "Zed", so create "ZMR-TEST-FIXTURE Contact Zed" inline and link with a role. | Two contacts listed. (In the real app this same person could later be linked to a property or a second entity — one contact record, many links.) | PASSED (terminal, mock) — link flow only; multi-method step A3.5 OWNER |
| A3.7 | Linked properties. | Empty state in the harness (the fixture entity owns nothing). In the real app this lists each property the entity holds an interest in, with percentage, and a "Remove this entity's interest" action that requires a reason. | PASSED (terminal, mock) — empty state only |
| A3.8 | Tax classification (view). | "Multiple members", "Partnership", and an Election history table with one row: Form 8832 / submitted / 2026-09-01, with "Mark accepted" and "Supersede" actions. | PASSED (terminal, mock) |
| A3.9 | Tax classification → **Edit** → change Federal tax treatment; Save. | Field updates; nothing about the membership roster or legal structure changes on its own (never auto-derived). | OWNER — not yet done |
| A3.10 | Election history → **Mark accepted**. | The same row's status becomes "accepted" (an in-flight status update edits the same row). | OWNER — not yet done |
| A3.11 | Election history → **Supersede** → add a new election. | A new row appears; the old row is marked "superseded" and keeps its original facts. | OWNER — not yet done |
| A3.12 | Membership (view). | Empty state ("no members on file" wording). | PASSED (terminal, mock) |
| A3.13 | Membership → **Edit** → add "ZMR-TEST-FIXTURE Owner A" at 30%, leave completeness unchecked, reason, Save. | One member at 30%, badge "Incomplete". Same checkbox/reason pattern as the property Ownership box. | OWNER — not yet done |
| A3.14 | Membership → Edit → add Owner B at 70%, tick complete, reason, Save. | Two members, "Complete allocation". | OWNER — not yet done |
| A3.15 | Documents (view). | Empty state, plus an "Add a reference link" form (category, URL, label) in Edit. **No file-upload control is shown here** — the box explains that file upload isn't available on this screen yet because the hosted per-file limit is unverified, and that reference links work now. This is the intended Phase 1 behavior, not a bug. | PASSED (terminal, mock) |
| A3.16 | Documents → add a reference link with a fake URL. | The link is listed. | OWNER — not yet done |
| A3.17 | Financial accounts. | The existing, unchanged `LlcFinancialAccountsPanel` — empty state in the harness. In the real app this shows the entity's shared financial accounts exactly as it does today in Settings. | PASSED (terminal, mock) — empty state only |
| A3.18 | Corrections / history. | **Not visible in the harness** — the harness has no Activity/History tab wired. Corrections (who changed ownership, why, when) are recorded in `property_ownership_corrections` / `llc_membership_corrections` and become visible through the History surface owned by Batch M, which is not built yet. See B7. | UNTESTED — no UI surface yet |

### A4. Property information stale-edit guard (view: "Property information (stale-edit guard)")

This is the real `usePropertyProfile` save path and the real `PropertyForm`, plus a harness-only button that plays the role of a second person saving the same property from another browser.

| # | Step | Expected | Status |
|---|---|---|---|
| A4.1 | Click **Property information (stale-edit guard)**. | A button "Simulate another editor saving this property (0 so far)" and a "Property information" box showing Address "000 Fictional Test Way", Name, and the `updated_at` token. | PASSED (terminal, mock) |
| A4.2 | Click **Edit**, change Address to "123 My Unsaved Draft St". Do **not** save yet. | Edit form open with your draft. | PASSED (terminal, mock) |
| A4.3 | Click **Simulate another editor saving this property**. | Counter becomes "(1 so far)". Behind the scenes the stored row's address became "1 Changed-By-Someone-Else Ave" and its token moved. | PASSED (terminal, mock) |
| A4.4 | Click **Save**. | Save is **refused**. A notice appears above the form: "Your changes were not saved. 1 Changed-By-Someone-Else Ave was changed by someone else after you started editing. Your draft is still here…" with two buttons: **Discard my changes and load the latest version** and **Keep editing my draft**. Your draft "123 My Unsaved Draft St" is still in the Address field. There is **no** "overwrite anyway" option. | PASSED (terminal, mock) |
| A4.5 | Click **Keep editing my draft**. | Notice disappears; draft still intact; still in edit mode. | PASSED (terminal, mock) |
| A4.6 | Click **Save** again without doing anything else. | Refused again with the same notice — the app never silently re-bases your draft onto the newer version. | PASSED (terminal, mock) |
| A4.7 | Click **Discard my changes and load the latest version**. | The form re-seeds with the other editor's data ("1 Changed-By-Someone-Else Ave"); notice gone; still in edit mode so you can re-apply your edits by hand. | PASSED (terminal, mock) |
| A4.8 | Change Address to "456 Saved After Reload Ave", Save. | Save succeeds; box returns to view mode showing the new address and a new token. | PASSED (terminal, mock) |
| A4.9 | Edit → change something → **Cancel**. | View mode, unchanged. | OWNER — not yet done |
| A4.10 | Edit → try the property photo or deed upload control. | In the harness this **fails by design** with a "Mock storage: upload not available in this harness" message. That is the harness, not the app — see B9 for the real-environment expectation. | OWNER — not yet done (expected failure) |

---

## Checklist B — real integration acceptance (pending an isolated Supabase target)

**Precondition — not met today:** an isolated, nonproduction Supabase target with this repo's migrations applied (all 97, including `20260925080000_properties_set_updated_at.sql`), running the real app (`npm run dev`) pointed at that target, signed in as the reserved test-actor identity per CLAUDE.md. **Never the live "ZMR Real Estate" project.** Until the "Environment decision" below is made and carried out, every step here is **UNTESTED**.

Data rule for B: use `ZMR-TEST-` prefixed values throughout, on the isolated target only. Even there, do not copy live data in.

### B1. Entity screens

| # | Step | Expected | Status |
|---|---|---|---|
| B1.1 | Settings → Organization types → click an entity's name. | Opens `/entities/<id>` with the seven boxes from A3.1. | UNTESTED |
| B1.2 | Settings → Organization types → "View properties" on an entity. | Shows the same Linked properties panel as the profile page (one component, one write path). There is **no** "Reassign" dropdown anywhere in Settings any more. | UNTESTED |
| B1.3 | A brand-new account with zero entities/properties. | Entity list empty; opening `/entities/<nonexistent>` shows a not-found state, not an error page. | UNTESTED |

### B2. Partial ownership — 48%

| # | Step | Expected | Status |
|---|---|---|---|
| B2.1 | Property → Overview → Ownership → Edit → add one owner at 48%, leave completeness unchecked, reason, Save. | Accepted. Badge "Incomplete". Reload the page: still there (real persistence). | UNTESTED |
| B2.2 | Same set, tick complete, Save. | Refused with "A complete allocation must total exactly 100% (currently 48.00)" — enforced by the database function, not only the client. | UNTESTED |

### B3. Complete ownership — 100%

| # | Step | Expected | Status |
|---|---|---|---|
| B3.1 | Add a second owner at 52%, tick complete, reason, Save. | Accepted. "Complete allocation". | UNTESTED |
| B3.2 | Rebalance 48/52 → 50/50 in one edit, reason, Save. | Accepted atomically; both rows change together. | UNTESTED |
| B3.3 | Open the entity profile of one of those owners → Linked properties. | The property appears with its percentage. | UNTESTED |

### B4. Contact methods

| # | Step | Expected | Status |
|---|---|---|---|
| B4.1 | Entity → Contacts → create a contact with two methods (phone + email), one preferred. | Both stored; reload confirms. | UNTESTED |
| B4.2 | Link the same contact to a second entity (or a property) with a different role. | One contact record, two links; editing the contact's name once changes it everywhere. | UNTESTED |
| B4.3 | Confirm no login/access was created. | Settings → members list unchanged; the contact cannot sign in. | UNTESTED |

### B5. Membership

| # | Step | Expected | Status |
|---|---|---|---|
| B5.1 | Entity → Membership → add members 30% (incomplete), then 70% (complete). | Same rules as B2/B3, on the membership table — independent of property title. | UNTESTED |
| B5.2 | Try to add the entity as a member of itself. | Refused. | UNTESTED |

### B6. Stale edits (two concurrent editors)

| # | Step | Expected | Status |
|---|---|---|---|
| B6.1 | Two browser windows (or two devices), same account, same property → Overview → Property information. Window 1: Edit, change Address, do not save. Window 2: Edit, change Township, Save. | Window 2 saves normally. | UNTESTED |
| B6.2 | Window 1: Save. | Refused with the conflict notice from A4.4; draft retained; database still holds Window 2's values. | UNTESTED |
| B6.3 | Window 1: Keep editing → Save again. | Refused again (no silent rebase). | UNTESTED |
| B6.4 | Window 1: Discard and load latest → re-enter the Address change → Save. | Succeeds; both Window 2's Township and Window 1's Address are now stored. | UNTESTED |
| B6.5 | Same two-window test on the Ownership box. | Window 1's save is refused with a version-conflict message and the box refreshes to current data. | UNTESTED |
| B6.6 | Account isolation: a member of a *different* account attempts the same property id. | Sees nothing, changes nothing (RLS). | UNTESTED — verified only on scratch Postgres, see contract §9.2 |

### B7. Corrections / history

| # | Step | Expected | Status |
|---|---|---|---|
| B7.1 | After B2–B5, inspect correction records. | Every add/remove/percentage change has a row with your reason, who, and when. **No UI surface shows these yet** (Batch M, not started) — until then this is a database inspection by a terminal, read-only. | UNTESTED — no UI yet |
| B7.2 | Property information edits (B6). | Appear in the existing property History (audit_log) with old/new values; the `updated_at` token itself never appears as a change row. | UNTESTED |

### B8. Document references

| # | Step | Expected | Status |
|---|---|---|---|
| B8.1 | Entity → Documents → add a reference link. | Listed; reload confirms. | UNTESTED |
| B8.2 | Link one existing property document to two entities. | Visible from both entity profiles; still a single document record. | UNTESTED |

### B9. Uploads — explicitly unsupported on entity screens

| # | Step | Expected | Status |
|---|---|---|---|
| B9.1 | Entity → Documents. | There is **no** file-upload control. This is intentional (Phase 1) until the hosted per-file upload limit is verified. Do not treat its absence as a defect. | UNTESTED |
| B9.2 | Property → Overview → Property information → photo/deed upload. | Pre-existing property-side upload, unchanged by this batch. Whether a large file succeeds depends on the hosted limit, which is **still unverified** (no bucket-config read access from the CLI). | UNTESTED — blocked |

### B10. Shared financial-account visibility

| # | Step | Expected | Status |
|---|---|---|---|
| B10.1 | Settings → Financial accounts: add a `ZMR-TEST-` account for an entity. | Entity profile → Financial accounts shows it; no duplicate storage. | UNTESTED |
| B10.2 | Quick Capture → Payment method picker (opened after B10.1, no reload). | The new account appears (cross-module freshness). | UNTESTED |

### B11. Normal saves still work

| # | Step | Expected | Status |
|---|---|---|---|
| B11.1 | Edit and save Property information with no concurrent editor. | Saves first time, every time; no conflict notice. | UNTESTED |
| B11.2 | Create a new property from the registry. | Unchanged behavior (the guard applies only to updates of existing rows). | UNTESTED |

---

## Environment decision (the one thing needed to start Checklist B)

Read-only assessment details are in the contract v3.2 §9.5. In short, two viable paths, both requiring your action; neither was taken:

- **Option 1 — local Supabase stack (recommended).** Install Docker Desktop or Colima (free, open-source) so `supabase start` can run this project's real local stack (Postgres 17, PostgREST, Auth, Storage) on this Mac. Machine capability is not a concern (Apple Silicon, 16 GB RAM, ~600 GB free). No new cloud project, no recurring cost, nothing touches the live project.
- **Option 2 — second, nonproduction Supabase project.** Create one in the Supabase dashboard under the existing org. Free tier is sufficient for this testing; it becomes a second hosted project to keep track of.

**Decision needed from you:** which of the two to proceed with. The terminal will not install software or create a cloud project on its own.
