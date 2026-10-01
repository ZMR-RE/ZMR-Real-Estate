# Billing follow-up: property payment instructions and the invoice issuer (T4)

Built on live `d9cdcb3`. Frontend copy and view only: no migration, no change to queries' write paths, no change to the PDF design.

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

## Deeper blocker (reported, not built)

There's no direct way to **add** a person as an issuer who isn't recorded as an owner:
- **Owner records are created only by:** the Add-property wizard, which records ownership and doesn't ask for the kind; or Settings › Organizations › "Organization types", which is business-oriented and also has no kind.
- **The kind** can only be set afterwards, under Identity, and only while it's still unset.

The help text now names the existing route for real owners: add them as an owner, then set Individual. A proper "Add a person" route needs a product decision:
- **(a)** an "Add person" action in the issuer field that creates an owner record with kind Individual and no ownership; or
- **(b)** a kind choice in the property wizard's new-owner row, which avoids an extra step for owners.

Either is small. Neither is built without approval.
