import type { Category, Transaction } from './financialsQueries'

// M5 — a small fictional ledger with expected results worked out BY HAND
// (see EXPECTED below), independent of any calculation helper, so the
// helpers are checked against arithmetic rather than against themselves.
// Every name/id is fictional ("t2-m5-").

const MAPLE = { id: 't2-m5-maple', name: null, address: '100 ZMR-TEST-T2 Maple Ln' }
const CEDAR = { id: 't2-m5-cedar', name: null, address: '200 ZMR-TEST-T2 Cedar Ct' }

let seq = 0
function tx(
  property: typeof MAPLE,
  entry_type: 'income' | 'expense',
  category: Category,
  amount: number,
  transaction_date: string,
  extra: Partial<Transaction> = {},
): Transaction {
  seq += 1
  return {
    id: `t2-m5-tx-${seq}`,
    entry_type,
    category,
    subcategory: null,
    vendor: entry_type === 'expense' ? { id: 't2-m5-vendor', name: 'ZMR-TEST-T2 Vendor', split_percentage: null, split_description: null } : null,
    tenant: entry_type === 'income' ? { id: 't2-m5-tenant', name: 'ZMR-TEST-T2 Tenant' } : null,
    prospective_tenant: null,
    unit: null,
    payment_method: 'ZMR-TEST-T2 Bank',
    repair_or_improvement: null,
    amount,
    transaction_date,
    description: `ZMR-TEST-T2 m5 #${seq}`,
    voided: false,
    statement_reconciled: false,
    property,
    responsible_entity: null,
    reimbursement_source_id: null,
    ...extra,
  }
}

export const M5_PROPERTIES = [MAPLE, CEDAR]

export const M5_TRANSACTIONS: Transaction[] = [
  // Maple 2025
  tx(MAPLE, 'income', 'rents_received', 1450, '2025-01-05'),
  tx(MAPLE, 'income', 'rents_received', 1450, '2025-02-05'),
  tx(MAPLE, 'expense', 'repairs', 312.4, '2025-03-12', { repair_or_improvement: 'repair' }),
  tx(MAPLE, 'expense', 'repairs', 4800, '2025-06-30', { repair_or_improvement: 'improvement' }),
  tx(MAPLE, 'expense', 'mortgage_interest', 610.25, '2025-09-15'),
  tx(MAPLE, 'expense', 'supplies', 20, '2025-05-05', { voided: true }),
  // Cedar 2025
  tx(CEDAR, 'income', 'rents_received', 1100, '2025-01-10'),
  tx(CEDAR, 'expense', 'taxes', 2345.67, '2025-04-20'),
  tx(CEDAR, 'expense', 'utilities', 91.19, '2025-11-02'),
  tx(CEDAR, 'expense', 'cleaning_and_maintenance', 1000, '2025-08-08', { repair_or_improvement: 'improvement' }),
  // Year boundaries
  tx(CEDAR, 'expense', 'utilities', 50, '2024-12-31'),
  tx(CEDAR, 'income', 'rents_received', 1100, '2026-01-03'),
]

// Mortgage principal comes from the Mortgage module (mortgage_payments),
// the existing supported path — never double-posted as a transaction.
export const M5_PRINCIPAL_PAYMENTS = [
  { property_id: MAPLE.id, principal_amount: 200, payment_date: '2025-02-01' },
  { property_id: MAPLE.id, principal_amount: 200, payment_date: '2025-03-01' },
  { property_id: MAPLE.id, principal_amount: 201.5, payment_date: '2025-04-01' },
  { property_id: MAPLE.id, principal_amount: 190, payment_date: '2024-12-01' },
]

export function in2025<T extends { transaction_date?: string; payment_date?: string }>(rows: T[]): T[] {
  return rows.filter((r) => (r.transaction_date ?? r.payment_date ?? '').startsWith('2025-'))
}

// Hand-computed. Voided rows and other years are excluded everywhere.
//   income:            1450 + 1450 + 1100                 = 4000.00
//   operating expense: 312.40 + 610.25 + 2345.67 + 91.19  = 3359.51
//   improvements:      4800 + 1000                        = 5800.00
//   net operating:     4000.00 − 3359.51                  =  640.49
//   after all spending: 640.49 − 5800.00                  = −5159.51
//   principal (2025):  200 + 200 + 201.50                 =  601.50
//   cash flow:         640.49 − 601.50 − 5800.00          = −5761.01
export const EXPECTED = {
  all2025: {
    income: 4000,
    operatingExpense: 3359.51,
    capitalImprovements: 5800,
    netOperating: 640.49,
    netAfterAllSpending: -5159.51,
    principal: 601.5,
    netCashFlow: -5761.01,
    scheduleE: { rents_received: 4000, repairs: 312.4, mortgage_interest: 610.25, taxes: 2345.67, utilities: 91.19, cleaning_and_maintenance: 0, supplies: 0 },
  },
  // Maple: 2900 − 922.65 = 1977.35; − 4800 = −2822.65; cash 1977.35 − 601.50 − 4800 = −3424.15
  maple2025: { income: 2900, operatingExpense: 922.65, capitalImprovements: 4800, netOperating: 1977.35, netAfterAllSpending: -2822.65, netCashFlow: -3424.15 },
  // Cedar: 1100 − 2436.86 = −1336.86; − 1000 = −2336.86; no principal
  cedar2025: { income: 1100, operatingExpense: 2436.86, capitalImprovements: 1000, netOperating: -1336.86, netAfterAllSpending: -2336.86, netCashFlow: -2336.86 },
  // Balance sheet cash (assumes $0 opening balance — NOT a verified bank balance):
  //   Maple all-time: 2900 − (922.65 + 4800) − (601.50 + 190) = −3614.15
  //   Cedar all-time: (1100 + 1100) − (2345.67 + 91.19 + 1000 + 50) = −1286.86
  balanceSheetCash: { maple: -3614.15, cedar: -1286.86 },
}
