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
