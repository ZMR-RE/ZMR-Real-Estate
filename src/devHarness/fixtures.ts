// Obviously fictional fixture data for the isolated browser-test harness
// — same "ZMR-TEST-FIXTURE" convention used in the SQL-level verification
// (see the implementation contract), never a real property/entity
// identity. Held entirely in memory; reset on every page reload.
import type { MockDb } from './mockSupabase'

export const FIXTURE_ACCOUNT_ID = 'harness-account-1'

export const FIXTURE_LLCS = [
  {
    id: 'harness-llc-owner-a',
    account_id: FIXTURE_ACCOUNT_ID,
    name: 'ZMR-TEST-FIXTURE Owner A',
    ein: null,
    formation_state: null,
    registered_agent: null,
    formation_date: null,
    annual_report_due_date: null,
    holding_company_id: null,
    holding_company: null,
    archived: false,
    owner_kind: 'individual',
    display_name: null,
    legal_structure: null,
    mailing_address: null,
    mailing_city: null,
    mailing_state: null,
    mailing_zip: null,
    notes: null,
    membership: null,
    federal_tax_treatment: null,
    federal_tax_treatment_effective_date: null,
    tax_verification_status: null,
    tax_verified_by: null,
    tax_verified_at: null,
    last_verified_date: null,
    last_verified_by: null,
  },
  {
    id: 'harness-llc-owner-b',
    account_id: FIXTURE_ACCOUNT_ID,
    name: 'ZMR-TEST-FIXTURE Owner B',
    ein: null,
    formation_state: null,
    registered_agent: null,
    formation_date: null,
    annual_report_due_date: null,
    holding_company_id: null,
    holding_company: null,
    archived: false,
    owner_kind: 'individual',
    display_name: null,
    legal_structure: null,
    mailing_address: null,
    mailing_city: null,
    mailing_state: null,
    mailing_zip: null,
    notes: null,
    membership: null,
    federal_tax_treatment: null,
    federal_tax_treatment_effective_date: null,
    tax_verification_status: null,
    tax_verified_by: null,
    tax_verified_at: null,
    last_verified_date: null,
    last_verified_by: null,
  },
  {
    id: 'harness-llc-entity',
    account_id: FIXTURE_ACCOUNT_ID,
    name: 'ZMR-TEST-FIXTURE Holdings LLC',
    ein: null,
    formation_state: 'Illinois',
    registered_agent: null,
    formation_date: null,
    annual_report_due_date: null,
    holding_company_id: null,
    holding_company: null,
    archived: false,
    owner_kind: 'entity',
    display_name: null,
    legal_structure: 'llc',
    mailing_address: null,
    mailing_city: null,
    mailing_state: null,
    mailing_zip: null,
    notes: null,
    membership: 'multiple_members',
    federal_tax_treatment: 'partnership',
    federal_tax_treatment_effective_date: null,
    tax_verification_status: null,
    tax_verified_by: null,
    tax_verified_at: null,
    last_verified_date: null,
    last_verified_by: null,
  },
]

export const FIXTURE_PROPERTIES = [
  {
    id: 'harness-property-1',
    account_id: FIXTURE_ACCOUNT_ID,
    name: 'ZMR-TEST-FIXTURE Property One',
    address: '000 Fictional Test Way',
    llc_id: null,
    status: 'active',
  },
]

function ownerRef(llcId: string) {
  const llc = FIXTURE_LLCS.find((l) => l.id === llcId)
  return { display_name: llc?.display_name ?? null, name: llc?.name ?? 'Unknown' }
}

export function buildFixtureDb(): MockDb {
  return {
    llcs: FIXTURE_LLCS.map((l) => ({ ...l })),
    properties: FIXTURE_PROPERTIES.map((p) => ({ ...p })),
    property_ownership_interests: [
      {
        id: 'harness-poi-1',
        account_id: FIXTURE_ACCOUNT_ID,
        property_id: 'harness-property-1',
        llc_id: 'harness-llc-owner-a',
        owner_name: ownerRef('harness-llc-owner-a'),
        percentage: 48,
        effective_date: null,
        end_date: null,
        is_current: true,
        recorded_at: new Date().toISOString(),
      },
    ],
    property_ownership_versions: [
      { property_id: 'harness-property-1', account_id: FIXTURE_ACCOUNT_ID, version: 1, allocation_status: 'incomplete' },
    ],
    property_ownership_summary: [
      {
        property_id: 'harness-property-1',
        account_id: FIXTURE_ACCOUNT_ID,
        owner_count: 1,
        owners_with_percentage: 1,
        percentage_total: 48,
        completeness: 'incomplete',
      },
    ],
    property_ownership_corrections: [],
    llc_membership_interests: [],
    llc_membership_versions: [],
    llc_membership_summary: [
      { llc_id: 'harness-llc-entity', account_id: FIXTURE_ACCOUNT_ID, member_count: 0, members_with_percentage: 0, percentage_total: null, completeness: 'none' },
    ],
    llc_membership_corrections: [],
    llc_tax_elections: [
      {
        id: 'harness-election-1',
        account_id: FIXTURE_ACCOUNT_ID,
        llc_id: 'harness-llc-entity',
        election_type: 'Form 8832',
        status: 'submitted',
        submitted_date: '2026-09-01',
        effective_date: null,
        acceptance_date: null,
        notes: null,
        superseded_by_id: null,
        created_at: new Date().toISOString(),
      },
    ],
    contacts: [{ id: 'harness-contact-1', account_id: FIXTURE_ACCOUNT_ID, name: 'ZMR-TEST-FIXTURE Contact Dana', notes: null, archived: false }],
    contact_methods: [
      { id: 'harness-method-1', account_id: FIXTURE_ACCOUNT_ID, contact_id: 'harness-contact-1', method_type: 'email', value: 'dana@fixture.example', label: 'Work', is_preferred: true },
    ],
    contact_links: [
      { id: 'harness-link-1', account_id: FIXTURE_ACCOUNT_ID, contact_id: 'harness-contact-1', property_id: null, llc_id: 'harness-llc-entity', role: 'Property manager', is_primary_contact: true },
    ],
    documents: [],
    document_owner_links: [],
    property_financial_accounts: [],
  }
}
