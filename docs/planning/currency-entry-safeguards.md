# Currency-entry safeguard rollout

Owner instruction October 5, 2026: every expected dollar amount needs a bank-like decimal safeguard.

Status: rule recorded; dashboard-wide implementation NOT complete. No application or database change in this document. P4 remains pinned to55d5de3; migration unchanged.

Recommendation adopted for implementation planning: explicit dollar entry,125→125.00 on blur, blank remains blank, two decimal places, decimal mobile keyboard, validation before save; no silent decimal shifting/truncation. Keep legitimate signed/zero amounts and field-specific limits. Existing numeric database scale may round excess precision: verify server input handling in any conversion; do not claim the current database rejects every malformed monetary string.

- [ ] Shared input/parser: audit currencyInput.ts and all consumers; reject ambiguous/malformed paste without silently altering value; test typing, paste, deletion, focus/blur, keyboard, zero, required/optional, negative and range cases.
- [ ] Mortgage summary/details, payment, escrow and payoff planner dollar inputs: implement and visually audit next; preserve rate fields and duplicate/saving guards. This is NOT already included in P4 candidate55d5de3.
- [ ] Convert remaining monetary inputs in the inventory below. Classify percentages/counts/dates as noncurrency; document each disposition. Unit tests plus desktop/phone visual review before release.

## Candidate numeric-input inventory (audit checklist)
This conservative source scan includes number/decimal fields and existing currency-helper consumers; noncurrency fields must be excluded individually. It is an audit inventory, not a claim that each listed file is deficient or every free-text financial field has been identified. Complete the text/paste/custom-control sweep before claiming full rollout.

- [ ] `src/devHarness/PropertyFormGroupedPreview.tsx`
- [ ] `src/modules/actionQueue/ActionItemForm.tsx`
- [ ] `src/modules/automations/preview/AgentAllocationEditor.tsx`
- [ ] `src/modules/automations/preview/AgentInvoiceApprovalCard.tsx`
- [ ] `src/modules/bankReconciliation/BankReconciliation.tsx`
- [ ] `src/modules/billingSettings/ChargeRuleForm.tsx`
- [ ] `src/modules/billingSettings/StatementForm.tsx`
- [ ] `src/modules/capture/CaptureEntryDetailsForm.tsx`
- [ ] `src/modules/capture/CaptureForm.tsx`
- [ ] `src/modules/financials/TransactionForm.tsx`
- [ ] `src/modules/insurance/InsurancePolicyForm.tsx`
- [ ] `src/modules/leases/LeaseForm.tsx`
- [ ] `src/modules/leases/LeaseList.tsx`
- [ ] `src/modules/llcs/EntityMembershipSection.tsx`
- [ ] `src/modules/mortgagePayoff/EscrowTransactionForm.tsx`
- [ ] `src/modules/mortgagePayoff/MortgageDetailsForm.tsx`
- [ ] `src/modules/mortgagePayoff/MortgagePaymentForm.tsx`
- [ ] `src/modules/mortgagePayoff/MortgagePayoffScenarioForm.tsx`
- [ ] `src/modules/mortgageTab/MortgagePlanner.tsx`
- [ ] `src/modules/properties/PropertyForm.tsx`
- [ ] `src/modules/properties/PropertyOwnershipInterestsSection.tsx`
- [ ] `src/modules/propertyTax/PropertyTaxInstallmentForm.tsx`
- [ ] `src/modules/propertyValueHistory/PropertyValueHistoryForm.tsx`
- [ ] `src/modules/rentInvoices/InvoiceEditForm.tsx`
- [ ] `src/modules/rentInvoices/NewInvoicePanel.tsx`
- [ ] `src/modules/rentOps/PaymentForm.tsx`
- [ ] `src/modules/securityDeposits/DepositForm.tsx`
- [ ] `src/modules/securityDeposits/DepositTransactionForm.tsx`
- [ ] `src/modules/vendorEstimates/VendorEstimateForm.tsx`
- [ ] `src/modules/vendors/VendorSplitRules.tsx`

## October 6 local mortgage slice (not released)
New strict helper/component added separately from legacy currencyInput.ts: audited consumers are CaptureForm, CaptureEntryDetailsForm, useCaptureForm, captureActions and VendorEstimateForm. Their current behavior is unchanged; they remain pending conversion. Mortgage details (4 fields), payment (3), escrow (1), property payoff planner and the older standalone planner now use strict validation and padding. Form submission repeats validation; optional whitespace escrow becomes null. Column limits match numeric(12,2)/numeric(10,2); loan-original/monthly-payment positive rules match stored constraints. No money stored in the planner.
Refresh regression also preserves the edit-time optimistic concurrency baseline; a displayed conflict/partial-save explicitly updates the next retry baseline. Background refresh neither closes editing nor silently advances that baseline. Loan details uses the shared calendar-date formatter.
No production push or database alteration. Direct API/server precision hardening and remaining monetary fields are still pending; dashboard-wide checkbox remains open.
