// Maps the database's draft blockers (get_invoice_draft_blockers) and action
// errors to plain messages and the dashboard home where the owner fixes
// them. Missing information is shown as review-needed (light yellow), never
// guessed.

export type DraftBlocker =
  | 'lease_not_found'
  | 'lease_rent'
  | 'due_day'
  | 'billing_entity'
  | 'billing_recipient'
  | 'not_active_in_period'
  | 'prorate_manual'
  | 'already_invoiced'

export interface BlockerInfo {
  message: string
  // Where the field lives in the dashboard (RP1/RP2 homes).
  home: string | null
  // Informational blockers aren't missing data (e.g. already invoiced).
  missingInformation: boolean
}

export const DRAFT_BLOCKERS: Record<DraftBlocker, BlockerInfo> = {
  lease_not_found: { message: 'Tenancy not found in this account.', home: null, missingInformation: false },
  lease_rent: { message: 'No rent amount on the tenancy.', home: 'Tenant profile › Tenancy & billing', missingInformation: true },
  due_day: { message: 'No rent due day set.', home: 'Tenant profile › Tenancy & billing', missingInformation: true },
  billing_entity: { message: 'The property has no invoice issuer (person or business) chosen.', home: 'Property › Billing settings', missingInformation: true },
  billing_recipient: { message: 'No billing recipient chosen among the tenants.', home: 'Tenant profile › Tenancy & billing', missingInformation: true },
  not_active_in_period: { message: 'The tenancy isn’t active in this month.', home: null, missingInformation: false },
  prorate_manual: { message: 'Partial month set to manual — enter the amount on the draft.', home: 'Tenant profile › Tenancy & billing', missingInformation: true },
  already_invoiced: { message: 'An invoice for this month already exists.', home: null, missingInformation: false },
}

export function describeBlockers(codes: string[]): BlockerInfo[] {
  return codes.map((c) => DRAFT_BLOCKERS[c as DraftBlocker] ?? { message: `Unknown blocker: ${c}`, home: null, missingInformation: false })
}

// Database action errors (ZM3xx) the screens need to explain specifically.
export const ACTION_ERRORS: Record<string, string> = {
  ZM324: 'This invoice changed since you opened it. Reload to see the latest version before continuing.',
  ZM325: 'That action isn’t available for this invoice’s current state.',
  ZM331: 'The approval no longer matches this invoice; approve it again.',
  ZM332: 'Choose the invoice issuer first.',
  ZM333: 'The invoice issuer has no invoice code yet (their profile › Invoicing).',
  ZM336: 'A revision of this invoice is already in progress.',
  ZM338: 'Payments are recorded against this invoice, so it can’t be cancelled here.',
  ZM344: 'A run is already in progress for this assistant.',
}

export function actionErrorMessage(error: { code?: string; message: string }): string {
  return (error.code && ACTION_ERRORS[error.code]) || error.message
}
