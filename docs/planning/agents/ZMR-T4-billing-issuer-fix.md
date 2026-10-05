# Billing follow-up: property payment instructions and the invoice issuer (T4)

Built on live `d9cdcb3`. No migration and no change to the PDF design. Sections 1–2 are copy and view only; section 3 adds one write (creating a person owner record).

## 1. Saved payment instructions were hidden with no issuer (fixed)

**Reproduced on `d9cdcb3`** in the local harness, which runs the simulated backend:
- On a property with no issuer, I saved the property's own payment instructions.
- The view showed only "No invoicing entity chosen…", so the instructions were hidden.
- Edit still had them saved.

**Fix:** `PropertyBillingSettingsSection` now builds the issuer and the payment instructions independently. With no issuer chosen, it shows the "No invoice issuer chosen" callout **and** "Payment instructions — This property's own instructions".

**Verified:** save, then leave and return (the page remounts and re-reads), then re-edit and Cancel, all with no issuer. The instructions stay visible and intact (evidence 01–04).

## 2. "Invoice issuer" is a person or a business

- **Wording:**
  - The Billing settings label is now "Invoice issuer (person or business)", and the view shows the issuer's kind (Person or Business) when the owner record says so. It is never guessed from the name.
  - The same wording is used in Rent ops (Invoice issuer), the blocker and error messages, and the "changed since approved" list.
- **Help text in the issuer field:**
  - The issuer is chosen explicitly. It isn't taken from the ownership list or from who is signed in.
  - The list is your owner records.
  - To issue as a person, choose their record; if it doesn't say "person" yet, set *Owner / entity kind* to Individual under Identity on their profile.
- **Verified with fictional data:**
  - The fictional person "Riley Example" was set to Individual and given code RE.
  - They were chosen as the issuer of 410 Example Street, with the property's own instructions.
  - A new December draft used them; it was approved and issued as **RE-INV-000001**.
  - The PDF shows "Riley Example" and their address. No company name was invented (evidence 05–09).
- **Preserved:**
  - The already-issued A-INV-000001 still shows "Issued by Example Holdings".
  - The existing November draft kept its explicitly chosen issuer.
  - Entered instructions were kept.

## 3. "+ Add person" in the issuer field (approved direct path, built)

**Before:** there was no direct way to add a person as an issuer who isn't recorded as an owner. Owner records came only from the Add-property wizard (which records ownership and doesn't ask for the kind) or Settings › Organizations, and the kind could only be set afterwards.

**Now:** Billing settings › Edit › Invoice issuer › **+ Add person**.
- A small step asks for "Person's full name*" with "Save person" and "Cancel". Enter adds the person; it doesn't submit the Billing settings form.
- It creates an owner record of kind **Individual**, reusing the existing owner/issuer records (`llcs`). No ownership row is written, so no property ownership is assigned.
- The new person is chosen in the issuer list ("Taylor Fictional — person"). Nothing is saved for the property until Billing settings › Save. A note says to add their invoice code on their profile before issuing.
- **Same name:** if the name matches an existing record (ignoring case and spacing), the step offers "Use existing: …" for each match, and "Add a different person with this name". Reuse is never forced; two different people can share a name.
- The issuer hint now reads: "The list is your owner records. Not listed? Use + Add person — it doesn't make them an owner of any property."
- No wizard change.

**Verified** (local harness, simulated backend, fictional data, 410 Example Street with no owner on file):
- Added "Taylor Fictional", chose them and saved. The view shows "Invoice issuer Taylor Fictional · Person" and the "no invoice code yet" note.
- Ownership still reads "No owner on file yet." Taylor's profile shows Active, Individual, "No properties linked yet."
- Typing "riley  example" offered "Use existing: Riley Example". Choosing "Add a different person with this name" left two separate records ("riley example — person" and "Riley Example"). Cancel kept the saved issuer, Taylor Fictional.
- Evidence: `evidence/billing-add-person/01–04`.

**Tests:** `issuersNamed` (case/spacing-insensitive matching on name or display name) in `billingSettingsLogic.test.ts`.

**Harness-only:** new owner records default `archived = false`, `invoice_code = null`, `display_name = null`.

**Not covered here:** the property wizard's new-owner row still doesn't ask for the kind (option (b) earlier); not requested for this slice.

## 4. T3 wording finding: "entity profile" → "their profile" (fixed)
An issuer can be a person, so issuer-facing copy no longer says "entity":
- Rent ops review: "…has no invoice code yet — add one on their profile (Invoicing)"; "add a default in the issuer's Branding & documents".
- New invoice: "Ready: the draft uses the tenancy's rent, due day and invoice issuer."
- Invoicing box on the profile: "this issuer" / "each issuer has its own sequence"; the code-lock messages likewise.
- Branding & documents: "Open their profile", "Used only on their documents", "Name and address come from Identity on their profile. Payment instructions print on their invoices."; the profile's Branding description says "invoices and receipts they issue"; logo alt text "Logo"; logo load error "The issuer's logo couldn't be loaded."
- **Not changed (ownership screens, outside this slice):** "this entity" in Linked properties, Contacts and Membership on the owner profile, and the Agents preview copy.

## 5. Save person: one save at a time, and an accurate hint (pre-clearance fix)
- **Guard:** while a save is running, another Enter in the name field or another click on Save person is ignored. The guard takes effect immediately, before the screen re-renders, so even very fast repeats can't create a second record. During the save the name field is disabled and the button reads "Saving…".
- **Hint:** "Save person saves them right away — they stay in your records even if you then cancel Billing settings." This matches what happens: the person record is created at Save person, and only the property's issuer choice waits for Billing settings › Save.
- **Verified (local review harness, simulated backend, fictional data; 9 Placeholder Lane):**
  - three Enter key presses in one burst created **1** "Quinn Fictional";
  - three Save person clicks in one burst created **1** "Avery Twice", which was chosen;
  - after cancelling Billing settings and reopening Edit, both people are still listed once.
- **Limitation:** this runs against the simulated backend, whose insert returns immediately. Against a real network the guard holds for the whole save.
- **Evidence:** `evidence/billing-add-person-guard/01`.

## Owner review fixes P4, P5 (October 2; owner chose "fix now")
- **P4, readable payment instructions:** in the Billing settings view, the instructions now take the full row at normal weight, at most ~70 characters a line, with line breaks kept (`.billing-instructions` in `billingSettings.css`). Before, they were large semibold text squeezed into a third of the width.
- **P5, shorter explanations:** the issuer field hints and the + Add person hint are shortened; their meaning is unchanged. "Saved right away as a person who can issue invoices — not as an owner. They stay even if you cancel Billing settings."
- **Unchanged:** saving, the Save person guard and same-name behaviour.
- **Edit name (b98fae0):** the same-name prompt also offers "Edit name", which goes back to the name, matching the tenant form.
- **One Save and one Cancel at a time (P1, applied to Billing; found during the review captures):** while + Add person is open, the Billing settings form hides its own Save and Cancel. The step's "Save person"/Cancel (or its same-name choices) are the only actions until it closes. `AddPersonIssuer` reports this through an optional `onOpenChange`. Checked in the harness: + Add person → only "Save person | Cancel"; a same name → only "Use existing… | Add a different person… | Edit name"; Cancel brings back "+ Add person | Save | Cancel"; Save person clicked 3× → exactly 1 person, chosen in the issuer field.
