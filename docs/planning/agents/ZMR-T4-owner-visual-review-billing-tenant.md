# Owner visual review: billing issuer + tenant entry

**Candidate:** `3ef4b62`. Screens are from the real app frame with fictional data:
- most from the local review page, with a **simulated backend**, at 1280 px unless noted;
- Practice-hosted shots are marked **[Practice]**.

Nothing is live yet. Please reply **Accept**, or list changes by number.

## Billing settings (Property › Overview › Billing settings › Edit)
1. **Issuer label and saved instructions without an issuer.** `evidence/billing-issuer-fix/02` and `03`.
2. **+ Add person** step, with the hint "…saved right away — they stay in your records even if you then cancel". `evidence/billing-add-person-guard/01` and `billing-add-person/01`.
3. **Saved issuer shown as "Person"**; their profile shows Individual with no linked properties. `billing-add-person/02` and `03`.
4. **Same name:** "Use existing" or "Add a different person with this name". `billing-add-person/04`.

## Tenants (Property › Overview › Tenants)
5. **"+ Add tenant" beside Edit** on the collapsed box, which opens straight into the form. `tenant-entry-t3/01` and `02`.
6. **Unit already has a tenancy:** choose "co-tenant (shares its rent)" or "separate tenancy (own rent)". `tenant-entry-t3/04`; phone at 390 px: `tenant-entry-t3/12`.
7. **Co-tenant form:** people only, no rent fields. `tenant-entry-t3/08`.
8. **Unfinished tenancy** offered by ID after a reload, with the rent prefilled on resume. `tenant-entry-t3/06` and `07`.
9. **Same-name people** show email or phone and the date added. Picker: `tenant-entry-t3/10`; prompt: `tenant-entry-t3/09`; **new**, a person already on the tenancy is shown, not offered: `tenant-entry-fp1-empty-state/01`.
10. **New empty-state text:** "No tenants yet — use + Add tenant above, or + Add lease on a unit in Units." `tenant-entry-fp1-empty-state/02`.

## Units (Property › Overview › Units › Edit › + Add lease)
11. **The same co-tenant/separate choice** and the unfinished-tenancy resume. `tenant-entry-units-choice/01` and `02`.

## Picker menus
12. **The menu is no longer cut off at a box's edge** at 1280, 900 and 390. `tenant-entry-dropdown-999d716/01–06`; **[Practice]** 390 px: `practice-billing-tenant/02`.

**Already accepted, not asked again:** Tenants → Add tenant (owner-approved) and the Add person direction.

**Open items, not in this release:** unit-status setup when the list is empty; Lease history refresh after a failed save from Tenants.
