#!/usr/bin/env python3
"""Full-row preservation check for the billing + tenant Practice window (T4).

Read-only queries are produced here and run ONLY through btpractice.sh select.

  bt_preserve.py fp-sql                 -> one SELECT: table|key|md5(full row as jsonb) for every row
  bt_preserve.py new-sql <ISO start>    -> one SELECT: table|key|row json for rows created/updated since start
  bt_preserve.py compare <baseline.txt> <after.txt> <new-rows.txt> <fixtures-out.txt>

compare (exit 0 only when ALL hold):
  1. every baseline row still exists with an IDENTICAL full-row fingerprint
     (any change to an existing lease's rent, end date, archive flag, tenant
     link, billing flag, or any other column fails, row by row);
  2. every row that is new after the window is an explicitly identified
     ZMR-TEST-BT fixture: its row mentions "zmr-test-bt" (any case), or it
     references (by any value) a fixture already identified — repeated until
     stable. Anything else is UNEXPLAINED and fails.
The identified fixture ids are written to fixtures-out.txt (table|key).
"""
import json, re, sys

TABLES = ['accounts', 'account_members', 'llcs', 'property_ownership_interests', 'property_ownership_versions',
          'properties', 'units', 'leases', 'lease_tenants', 'lease_billing_terms', 'tenants',
          'invoices', 'invoice_lines', 'payments', 'documents', 'financial_transactions', 'financial_periods',
          'tenancy_charge_rules', 'entity_document_branding', 'audit_log']
KEY = "coalesce(j->>'id', j->>'lease_id', j->>'entity_id')"

def fp_sql():
    parts = [f"select '{t}' t, {KEY} k, md5(j::text) fp from (select to_jsonb(x) j from {t} x) s{i}" for i, t in enumerate(TABLES)]
    return "select string_agg(t || '|' || k || '|' || fp, ' ' order by t, k) from (" + " union all ".join(parts) + ") u"

def new_sql(start):
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', start)
    cond = f"coalesce(j->>'created_at', j->>'updated_at') >= '{start}'"
    parts = [f"select '{t}' t, {KEY} k, j from (select to_jsonb(x) j from {t} x) s{i} where {cond}" for i, t in enumerate(TABLES)]
    return "select jsonb_agg(jsonb_build_object('t', t, 'k', k, 'j', j)) from (" + " union all ".join(parts) + ") u"

def parse_fp(path):
    rows = {}
    for t, k, fp in re.findall(r'([a-z_]+)\|([^|\s"]+)\|([0-9a-f]{32})', open(path).read()):
        rows[(t, k)] = fp
    return rows

def parse_new(path):
    text = open(path).read()
    start = text.find('[{')
    if start < 0:
        return []
    return json.JSONDecoder().raw_decode(text[start:])[0]

def compare(base_p, after_p, new_p, out_p):
    base, after, new_rows = parse_fp(base_p), parse_fp(after_p), parse_new(new_p)
    ok = True
    changed = [k for k in base if k in after and after[k] != base[k]]
    missing = [k for k in base if k not in after]
    for t, k in changed: print(f'CHANGED existing row: {t}|{k}'); ok = False
    for t, k in missing: print(f'MISSING existing row: {t}|{k}'); ok = False
    added = {k for k in after if k not in base}
    details = {(r['t'], r['k']): r['j'] for r in new_rows}
    fixtures, values = set(), set()
    changed_flag = True
    while changed_flag:
        changed_flag = False
        for key in added - fixtures:
            j = details.get(key)
            if j is None:
                continue
            text = json.dumps(j).lower()
            refs = {str(v) for v in j.values() if v is not None}
            if 'zmr-test-bt' in text or refs & values:
                fixtures.add(key); values.add(key[1]); changed_flag = True
    for key in sorted(added - fixtures):
        print(f'UNEXPLAINED new row: {key[0]}|{key[1]}' + ('' if key in details else ' (no details: no timestamp)')); ok = False
    with open(out_p, 'w') as f:
        for t, k in sorted(fixtures):
            f.write(f'{t}|{k}\n')
    print(f'baseline rows {len(base)}; unchanged {len(base) - len(changed) - len(missing)}; changed {len(changed)}; missing {len(missing)}; '
          f'new {len(added)}; identified ZMR-TEST-BT fixtures {len(fixtures)}; unexplained {len(added - fixtures)}')
    print('PRESERVATION: PASS' if ok else 'PRESERVATION: FAIL')
    return 0 if ok else 1

if __name__ == '__main__':
    m = sys.argv[1]
    if m == 'fp-sql': print(fp_sql())
    elif m == 'new-sql': print(new_sql(sys.argv[2]))
    elif m == 'compare': sys.exit(compare(*sys.argv[2:6]))
    else: sys.exit(__doc__)
