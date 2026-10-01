# Tenant entry from Property Overview › Tenants (T4)

Built on live `d9cdcb3`. This is a separate candidate from the billing follow-up (`36e85ac`). No migration and no change to shared navigation.

## What the owner gets
**Property Overview › Tenants › Edit → add a tenant.**
1. Choose a unit of this property (chosen automatically when there's only one).
2. Choose an existing person, or create a new tenant. Add co-tenants as needed.
3. Enter the dates and rent, then Save.

The same box keeps the box standard: the only action is Edit at the top right, and adding happens inside the Edit state.

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

## Verified (local review harness, simulated backend, fictional data)
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
Shared-file hold recorded at 21:53 UTC for the tenants and leases files, `UnitsSection` and the Tenants/Units wiring in `PropertyProfileOverviewTab.tsx`. `PropertyProfile.tsx` (T2's hold) and `index.css` are untouched.
