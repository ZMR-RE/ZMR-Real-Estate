#!/usr/bin/env python3
"""Full-row preservation check for the billing + tenant Practice window (T4).

Read-only queries are produced here and run ONLY through btpractice.sh select.

  bt_preserve.py fp-sql                 -> one SELECT: table|key|md5(full row as jsonb) for every row
  bt_preserve.py new-sql <ISO start>    -> one SELECT: table|key|row json for every row written since
                                           start (per-table timestamp columns; tables with no
                                           timestamp column return all rows)
  bt_preserve.py compare <baseline.txt> <after.txt> <new-rows.txt> <fixtures-out.txt>

compare passes (exit 0) only when BOTH hold:
  1. every baseline row still exists with an IDENTICAL full-row fingerprint — any
     change to any column of an existing row (an existing lease's rent, end date or
     archive flag; a tenant link; an action item; ...) fails, row by row;
  2. every new row is an explicitly identified ZMR-TEST-BT fixture, by the table's
     own rule (RULES below), repeated until stable:
       - root rows (properties, llcs, tenants) qualify only if one of their named
         identity columns contains "zmr-test-bt" (any case);
       - every other table qualifies only if ALL of its named reference columns are
         non-null and point at fixtures already identified — e.g. a lease_tenants
         row needs BOTH a fixture lease and a fixture tenant, an audit_log row needs
         record_id to be a fixture, an action_items row needs every non-null
         lease_id/unit_id/property_id to be a fixture (at least one present);
       - tables with no rule (accounts, account_members, invoices, payments,
         documents, financial_*, ...) never have fixtures: any new row there fails.
     Anything not identified is UNEXPLAINED and fails.
The identified fixtures are written to fixtures-out.txt (table|key).
"""
import json, re, sys
from pathlib import Path

# table -> timestamp columns that mark a row as written (None = no timestamp column)
TABLES = {
    'accounts': ['created_at'], 'account_members': ['created_at'],
    'llcs': ['created_at', 'updated_at'], 'properties': ['created_at', 'updated_at'],
    'property_ownership_interests': ['recorded_at'], 'property_ownership_versions': None,
    'units': ['created_at', 'updated_at'], 'leases': ['created_at', 'updated_at'],
    'lease_tenants': ['created_at'], 'lease_billing_terms': ['updated_at'],
    'tenants': ['created_at', 'updated_at'], 'tenancy_charge_rules': ['created_at', 'updated_at'],
    'invoices': ['created_at'], 'invoice_lines': ['created_at'], 'payments': ['created_at'],
    'documents': ['created_at'], 'financial_transactions': ['created_at', 'updated_at'],
    'financial_periods': ['created_at'], 'entity_document_branding': ['updated_at'],
    'action_items': ['created_at', 'updated_at'], 'audit_log': ['changed_at'],
}
KEY = "coalesce(j->>'id', j->>'lease_id', j->>'entity_id', j->>'property_id')"

# ('mention', identity columns) | ('all', reference columns) | ('present', reference columns)
RULES = {
    'properties': ('mention', ['address', 'name']),
    'llcs': ('mention', ['name', 'display_name']),
    'tenants': ('mention', ['name']),
    'units': ('all', ['property_id']),
    'leases': ('all', ['property_id', 'unit_id']),
    'lease_tenants': ('all', ['lease_id', 'tenant_id']),
    'lease_billing_terms': ('all', ['lease_id']),
    'tenancy_charge_rules': ('all', ['lease_id']),
    'property_ownership_interests': ('all', ['property_id', 'llc_id']),
    'property_ownership_versions': ('all', ['property_id']),
    'entity_document_branding': ('all', ['entity_id']),
    'audit_log': ('all', ['record_id']),
    'action_items': ('present', ['lease_id', 'unit_id', 'property_id']),
}


def fp_sql():
    parts = [f"select '{t}' t, {KEY} k, md5(j::text) fp from (select to_jsonb(x) j from {t} x) s{i}" for i, t in enumerate(TABLES)]
    return "select string_agg(t || '|' || k || '|' || fp, ' ' order by t, k) from (" + " union all ".join(parts) + ") u"


def new_sql(start):
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', start)
    parts = []
    for i, (t, ts) in enumerate(TABLES.items()):
        where = f" where greatest({', '.join(f'(j->>{c!r})::timestamptz' for c in ts)}) >= '{start}'" if ts else ''
        parts.append(f"select '{t}' t, {KEY} k, j from (select to_jsonb(x) j from {t} x) s{i}{where}")
    return "select jsonb_agg(jsonb_build_object('t', t, 'k', k, 'j', j)) from (" + " union all ".join(parts) + ") u"


def parse_fp(path):
    return {(t, k): fp for t, k, fp in re.findall(r'([a-z_]+)\|([^|\s"]+)\|([0-9a-f]{32})', Path(path).read_text())}


def parse_new(path):
    text = Path(path).read_text()
    start = text.find('[{')
    return [] if start < 0 else json.JSONDecoder().raw_decode(text[start:])[0]


def qualifies(table, row, fixture_keys):
    rule = RULES.get(table)
    if rule is None:
        return False
    kind, cols = rule
    if kind == 'mention':
        return any('zmr-test-bt' in str(row.get(c) or '').lower() for c in cols)
    present = [row.get(c) for c in cols if row.get(c) is not None]
    if kind == 'all' and len(present) != len(cols):
        return False
    return len(present) > 0 and all(str(v) in fixture_keys for v in present)


def compare(base_p, after_p, new_p, out_p):
    base, after, new_rows = parse_fp(base_p), parse_fp(after_p), parse_new(new_p)
    ok = True
    changed = sorted(k for k in base if k in after and after[k] != base[k])
    missing = sorted(k for k in base if k not in after)
    for t, k in changed:
        print(f'CHANGED existing row: {t}|{k}'); ok = False
    for t, k in missing:
        print(f'MISSING existing row: {t}|{k}'); ok = False
    added = {k for k in after if k not in base}
    details = {(r['t'], r['k']): r['j'] for r in new_rows}
    fixtures, keys = set(), set()
    grew = True
    while grew:
        grew = False
        for key in sorted(added - fixtures):
            row = details.get(key)
            if row is not None and qualifies(key[0], row, keys):
                fixtures.add(key); keys.add(key[1]); grew = True
    for key in sorted(added - fixtures):
        print(f'UNEXPLAINED new row: {key[0]}|{key[1]}' + ('' if key in details else ' (no row details)')); ok = False
    with open(out_p, 'w') as f:
        f.writelines(f'{t}|{k}\n' for t, k in sorted(fixtures))
    print(f'baseline rows {len(base)}; unchanged {len(base) - len(changed) - len(missing)}; changed {len(changed)}; '
          f'missing {len(missing)}; new {len(added)}; identified ZMR-TEST-BT fixtures {len(fixtures)}; '
          f'unexplained {len(added - fixtures)}')
    print('PRESERVATION: PASS' if ok else 'PRESERVATION: FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode == 'fp-sql':
        print(fp_sql())
    elif mode == 'new-sql':
        print(new_sql(sys.argv[2]))
    elif mode == 'compare':
        sys.exit(compare(*sys.argv[2:6]))
    else:
        sys.exit(__doc__)
