# Tenant entry from Property Overview › Tenants (T4)

Built on live `d9cdcb3`. This is a separate candidate from the billing follow-up (`36e85ac`). No migration and no change to shared navigation.

## What the owner gets
**Property Overview › Tenants › + Add tenant** (or Edit — both open the same form).
1. Choose a unit of this property (chosen automatically when there's only one).
2. If that unit has an unfinished tenancy, or a current/upcoming one, choose what you're adding (see below).
3. Choose an existing person, or create a new tenant. Add co-tenants as needed.
4. Enter the dates and rent (not for a co-tenant), then Save.

**Entry point:** the owner approved "Tenants → Add tenant", so "+ Add tenant" sits beside Edit in the box header, visible even when the box is collapsed. That explicit approval overrides the Edit-only box convention for this box. Edit stays; both open the box and the same edit state, and both hide while editing. It's one optional `EditableSection` prop (`addLabel`) that no other box uses. **CLAUDE.md:** the approved deviation is now noted under the Box interaction standard on this candidate branch only. The owner's uncommitted main checkout is untouched; the note merges with the candidate.

**After saving:**
- the Tenants list and the Units box both refresh;
- the box shows "Added to Unit X: <tenant> — Tenancy & billing" links that open each tenant's profile at Tenancy & billing.

## Reuse, with no second assignment system
- **Shared with Units › "+ Add lease":** the same `LeaseForm`, the same `createLease` (one lease, one or more `lease_tenants`), and the same tenant creation (`useTenants`). The new flow only adds the unit choice at property level.
- **Safeguards added to the shared form**, so both entry points get them:
  - A co-tenant slot never offers someone already chosen, and saving de-duplicates. Co-tenants share one lease, so the rent is stored once.
  - Creating a "new" tenant whose name matches an existing person offers "Use existing" first, with an explicit "Create a different person" option. A person saved earlier is reused, never silently merged.
  - **Partial failure:** if the lease saves but its tenant links fail, the form says so and keeps the lease id. Saving again updates that same lease and links only the missing tenants, so it never creates a second lease. The unit choice is locked until it finishes. Units › "+ Add lease" got the same retry.
- **Existing history:** never changed. If the chosen unit already has a current or upcoming tenancy, a note names it and points to "+ End lease" in Units.
- **Labels:** the form's button is now "Save", per the universal labelling rule.

## T3 findings (fixed in this candidate)

**1. A half-saved lease stays recoverable after Cancel, navigation and reload.** Creating a tenancy is two writes: the lease, then its tenant links. If the links fail, the lease is kept with no tenants. That **unfinished tenancy** is now found from the saved records (a live lease with no tenants linked), not from screen memory. Adding a tenancy on that unit (Tenants › + Add tenant, or Units › + Add lease) first shows "Unfinished tenancy on this unit" with its ID, saved date, start date and rent.
- "Resume tenancy <ID>" finishes that exact lease: the form starts from its saved dates, rent and fees, and Save links the tenants without creating a second lease.
- "Start a separate new tenancy instead" is an explicit choice.
- Nothing is deleted or adopted automatically. Tenant links are inserted in one statement, so a lease is either fully linked or has none; partial sets don't occur.

**2. Co-tenant vs separate tenancy is an explicit choice.** When the unit already has a current or upcoming tenancy, the owner chooses one of:
- **"A co-tenant on <names>'s tenancy"** — joins it and shares its rent. No new rent is added. The form shows people only (no dates or rent), skips anyone already on it, and Save only links them. The lease's rent, dates and fees are untouched.
- **"A separate tenancy with its own rent"** — its rent is counted in addition. If the current tenancy has ended, end it first with "+ End lease" in Units.

"Change" goes back to the choices unless a half-saved lease is being finished.

**3. Same-name people are told apart.**
- The picker labels anyone who shares a name with the details on their record: email, phone and date added. Unique names stay plain.
- The "already exists" prompt shows each match's details, plus what was just entered.
- "Create a different person with this name" stays available.

**Proposed durable fix (not built; needs separate migration review and approval):** one database function that inserts the lease and its tenant links together (atomic), so an unfinished tenancy can't arise at all. The frontend recovery above stays useful for any already-existing unfinished rows.

**Both entry points, one mechanism:** Units › "+ Add lease" asks the same questions as Tenants › + Add tenant: resume an unfinished tenancy, or add a co-tenant vs a separate tenancy. Both use the same pieces in `src/modules/leases/`:
- `useTenancyChoice`, the choice state;
- `TenancyChoicePanel`, built from `UnfinishedTenancyChoice` and `TenancyKindChoice`;
- `leaseFormForChoice`, the form for the chosen kind;
- `saveTenancy`, which saves co-tenant links only, finishes the resumed lease, or creates a new one.

Planning confirmed this completes the approved flow; it isn't a new feature.

## T3 verification (local review harness, simulated backend, fictional data)
The new `?persist=1` keeps the tenant, lease and link rows across a real page reload in that tab, so recovery is tested against saved rows.
- **Partial failure → reload → resume** (`?persist=1&fail-lease-links=1`, 410 Example Street › Unit 2):
  1. Chose "Create separate tenancy" with Casey Placeholder, $1,600 from Nov 1. Save failed after the lease saved: 5 leases, 5 links, 1 unfinished.
  2. Full page reload without the failure flag. + Add tenant › Unit 2 offered "Unfinished tenancy … rent $1,600.00", then Resume, with the form prefilled ($1,600, Nov 1). Chose Casey and saved.
  3. Result: **still 5 leases** and 6 links. The resumed lease has $1,600 stored once, linked to Casey, and no unfinished lease remains. Unit 2's leases are Jordan & Sam at $1,395 plus this one at $1,600, each counted once.
- **Co-tenant:** Unit 1 (Riley, $1,450) › "Add co-tenant". The picker didn't offer Riley; chose Morgan Demo and saved. Still 5 leases; Riley's lease now links Riley and Morgan, and its rent is still $1,450.
- **Same name:** a new tenant "riley  example" with a different email prompted "Use existing: Riley Example — riley@example.com · (555) 010-1111" and "You entered: riley.two@example.com". "Create a different person" left two records, and the picker shows "Riley Example — riley@example.com · (555) 010-1111" and "riley  example — riley.two@example.com · added October 1, 2026".
- **Units › + Add lease** (27 Sample Road › Unit A): the failed Save left 6 leases (1 unfinished, $900). Cancel, then "+ Add lease" again, offered it; Resume with Morgan finished it: 6 leases, the $900 stored once, no unfinished lease.
- **+ Add tenant** opens the collapsed box straight into the form; Cancel returns to the view with both buttons; Edit still opens the same form. Saving through + Add tenant created 1 lease and 1 link and refreshed the list.
- **Phone (390 px frame):** no horizontal scroll, and the header buttons and choice options stack.
- **Tests (`leaseFormLogic.test.ts`, 10):** these add same-name labels and details, unfinished detection, prefill, resume found from saved rows only (one lease, rent once), and co-tenant links only with the rent untouched.
- **Evidence:** `evidence/tenant-entry-t3/01–12`.

## T3 ended-lease finding (fixed)
A lease with no tenants whose end date has passed is **history**, not unfinished work. It's no longer offered as "Unfinished tenancy". The "could count its rent twice" warning no longer appears for it: an ended lease's rent isn't counted now, so the warning was false. It stays as it is in Lease history and is never deleted or changed. Only a current or upcoming lease with no tenants (no end date, or ending today or later) is offered for resume, and every choice is still explicit. Test: `unfinishedLeases` includes a lease ending today and excludes one that ended earlier.

## Units › + Add lease verification (local review harness, simulated backend, fictional data; 27 Sample Road › Unit A, Casey at $1,720)
- **Same choice:** "+ Add lease" shows "Unit A already has a current or upcoming tenancy. What are you adding?" with "Add co-tenant" and "Create separate tenancy".
- **Co-tenant:** the picker didn't offer Casey; chose Morgan. With `?fail-lease-links=1` armed, the first Save showed the failure and created no lease; the second Save linked Morgan. Result: still 4 leases, Casey's lease links Casey and Morgan, the rent is still $1,720, and the card reads "Tenant(s): Casey Placeholder, Morgan Demo".
- **Separate → partial failure → reload → resume:**
  1. "Create separate tenancy" with Sam at $800; the link failed, leaving 5 leases with one unfinished.
  2. After a full reload, "+ Add lease" offered "Unfinished tenancy". "Start a separate new tenancy instead" moved on to the co-tenant/separate choice; Cancel then "+ Add lease" offered the unfinished tenancy again.
  3. Resume prefilled $800; chose Sam and saved. Result: **still 5 leases**, $800 stored once and linked to Sam, nothing unfinished; Casey's $1,720 lease unchanged.
- **Tenants regression:** + Add tenant › Unit 1 shows the same choice. "Create separate tenancy" leads to the form, and "Change" returns to the choice.
- **Tests:** `leaseFormLogic.test.ts`, 12, adding `leaseFormForChoice` and `saveTenancy` (co-tenant links only; resume finishes the chosen lease; one lease per tenancy).
- **Evidence:** `evidence/tenant-entry-units-choice/01–02`.

## Dropdown verification against T2's fix 999d716 (evidence 028b4b4)
- **Environment:** a throwaway clone of this candidate (`6de7a0d`) with T2's `999d716` merged; the merge is clean and changes only `src/index.css`. The local review harness ran with the simulated backend and fictional data. **Not a candidate**; T2's fix ships through T2's own release.
- **Method:** each flow was set up as far as "Create separate tenancy", the tenant picker was opened with a real click, and the menu's last option, "+ Add new tenant", was checked to be the element under its own center point. Then it was clicked for real.

| Flow | 1280 | 900 | 390 |
|---|---|---|---|
| Tenants › + Add tenant › Unit 1 | menu 157px past the box bottom and fully shown; the click opened the new-tenant form; Specs & measurements below didn't toggle | same; form opened, box below untouched | same; form opened, box below untouched |
| Units › Unit A › + Add lease | menu over the nested history boxes, fully shown; form opened; no nested box toggled | same | same |

- **Every case:** while the menu is open the box's overflow is `visible`; it went back to `clip` after the menu closed (checked at 1280). No horizontal scroll at any width. The sticky tab bar stayed pinned in the screenshots.
- **Measurement:** 1280 used the real window; 900 and 390 used same-origin frames of exactly that width, because the browser window can't be resized that small.
- **Evidence:** `evidence/tenant-entry-dropdown-999d716/01–06`.
- **Ended-lease check, same environment:** an extra simulated lease on 410 › Unit 2 (2024, ended, no tenants, $1,200). Both + Add tenant and + Add lease showed only the co-tenant/separate choice, with no "Unfinished tenancy" and no "rent twice" text. Lease history still lists it as Ended.
- **Harness note:** Lease history shows "$NaN" for late and move-in fees on the harness's sample leases, which omit those fields. A real database returns null for them. This is a pre-existing gap in the simulated data, not an app change.

## Defect found, not fixed here (shared CSS, T2's index.css)
`.collapsible-section { overflow: clip }` (from the sticky-headers work) cuts off a picker's dropdown where it runs past the bottom of a box. In the Tenants form, with few fields below the picker, "+ Add new tenant" can be hidden or a click can land on the next box. **Workaround:** typing a name narrows the list so the options fit. The fix belongs in the shared box rule, without breaking sticky headers. T2's fix `999d716` has since been verified against this candidate's final Tenants and Units flows; see the section above. This candidate doesn't include it.

## Earlier verification (local review harness, simulated backend, fictional data)
**Scenario A** (`?fail-lease-links=1`, 410 Example Street › Unit 2, which already has Jordan & Sam):
- **Slot 1:** a new tenant, Avery Fictional, was created. The slot 2 list excluded Avery; Morgan Demo was chosen.
- **First Save:** "The lease was saved, but its tenants weren't all linked…", with 1 new lease and 0 links.
- **Second Save:** still 1 new lease, now 2 links (Avery and Morgan), $1,600 stored once.
- **Existing records:** all 4 existing leases and 5 links unchanged.
- **Refresh:** the Tenants list shows both new tenants; Unit 2's lease history shows the new tenancy plus the unchanged Jordan & Sam tenancy.

**Scenario B** (recovery):
- "Casey Recover" was created, then the form was cancelled: one person, no lease.
- Next attempt: Casey is in the picker, and typing "casey  RECOVER" as new shows the prompt. "Use existing", then Save: still one person, one new lease, one link.
- The confirmation link opens Casey's profile, where Tenancy & billing shows the $1,500 lease rent.

**Tests:** `leaseFormLogic.test.ts`, 6 tests (slot options, de-duplication, name match, missing links, and `createLease` retry against a fake client).

**Evidence:** `evidence/tenant-entry/01–05`.

## Harness-only changes (not in the app bundle)
These make the review page behave like the real database for these screens:
- unit and lease-tenant rows carry `account_id`; new leases default `archived = false`;
- the review client supports `.eq('unit.property_id', …)` and `.not(…)`;
- `?fail-lease-links=1` makes the next tenant-link save fail once;
- `window.__reviewDb` lets a reviewer inspect the simulated rows.

## Observations (existing behaviour, not changed here)
- The Tenants list labels an upcoming tenancy "Current", because a tenancy counts as current until its end date.
- The existing inline tenant form's button says "Add tenant" (F-3).

## Coordination
Shared-file holds are recorded at 21:53 UTC (tenants and leases files, `UnitsSection`, and the Tenants/Units wiring in `PropertyProfileOverviewTab.tsx`) and extended on October 1. The extension covers `src/shared/EditableSection.tsx` (the optional `addLabel`), `UnitCard.tsx`, the new lease/tenant files and one `DESIGN-SYSTEM.md` entry. `PropertyProfile.tsx` (T2's hold) and `index.css` are untouched.

**Harness-only additions:** `?persist=1` (tenancy rows survive a reload in that tab).

## Repeated-submit fix (found while preparing the Practice test build `3a75340`)
**Defect:** three Save clicks in one burst on a new tenancy created three leases. The rent would then be counted three times. The cause: Save, and the inline "Add tenant", were guarded only by `disabled={saving}`, React state that updates too late to stop clicks in the same burst. Units › + Add lease had the same pattern before this slice.

**Fix (frontend):** one shared, immediate in-flight guard, `src/modules/leases/singleFlight.ts`.
- **Where it's used:**
  - new-lease, resumed-lease and co-tenant saves, in `useAddTenancy.save` (Tenants › + Add tenant) and `useLeases.add` (Units › + Add lease);
  - inline new-tenant creation in `LeaseForm`, from both entry points.
- **Burst:** while a save is running, another call is ignored immediately, before any re-render, however slow the response.
- **Failure:** a failed or thrown save releases the guard, so retry works.
- **Success:** the form that just saved is locked until a new add starts (+ Add lease, a unit change, or "+ Add new tenant" opened again). A late click in the moment before the form closes can't save twice.
- **Retry id:** the half-saved lease's id is also held in a ref, so a retry always reads the latest id.
- **Limit:** a browser guard only. It doesn't replace the separately proposed atomic, idempotent database operation for a lease and its tenants.

**Tests:** `singleFlight.test.ts`, 7:
- a five-call burst during a slow save runs once;
- a failure, or a thrown error, releases the guard;
- after a success, nothing runs until reset;
- against a slow fake database:
  - a burst of new-tenancy Saves gives 1 lease, 1 link, rent once;
  - a burst of co-tenant Saves gives 1 link, no lease, rent untouched;
  - a failed link, then a retry burst, finishes the same lease once.

**Browser checks** (local review harness, simulated backend, fictional data; `?slow-writes=MS` delays tenancy inserts, harness-only):

| # | Path | Input | Result |
|---|---|---|---|
| 1 | Tenants › + Add tenant › Unit 1 › separate, Morgan, $777, writes delayed 1.5 s | 3 scripted Save clicks, then 3 **real** clicks and 3 **real** Enter presses while saving | **1** lease, **1** link (4 → 5 leases); the view shows "Added to Unit 1: Morgan Demo" |
| 2 | Same, $888, with a simulated link failure | Burst of 3 → failure message (1 lease, 0 links); then a retry burst of 3 | Still **1** lease; now 1 link |
| 3 | Tenants › Unit 1 › Add co-tenant › + Add new tenant "Burst Person" | 4 clicks on Add tenant, then a burst of 3 Saves | **1** "Burst Person" tenant; **1** new link on Riley's lease; no new lease; Riley's $1,450 unchanged |
| 4 | Units › Unit A › + Add lease › separate, Sam, $555, with a simulated link failure | Burst of 3 → failure; retry burst of 3 | **1** lease, **1** link; Casey's $1,720 unchanged |
| 5 | Reload and resume (`?persist=1`): Tenants › Unit 2 › separate, Casey, $1,234, with a simulated link failure | Burst → failure (1 unfinished lease) → **full reload** → offered "Unfinished tenancy … ID … rent $1,234.00" → Resume (prefilled 1234) → burst of 3 Saves | Still **5** leases; the $1,234 lease is linked to Casey; 0 unfinished |

**Evidence:** `evidence/tenant-entry-repeat-submit/01`. The table above holds the read-back results from each run.

**Harness note:** the first slow-response run produced extra leases. That came from a bug in the new `?slow-writes` wrapper, which replaced the awaitable builder with a promise, so every save threw at once and released the guard. The wrapper was fixed to keep the builder and only delay its answers, and all runs above use the fixed version. That bad run touched only simulated data and was discarded.
