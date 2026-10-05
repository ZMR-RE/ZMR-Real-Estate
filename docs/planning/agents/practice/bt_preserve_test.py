#!/usr/bin/env python3
"""Offline checks for bt_preserve.py (no database). Run: python3 bt_preserve_test.py"""
import io, json, os, re, sys, tempfile, unittest
from pathlib import Path
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bt_preserve as bp

H = lambda c: c * 32  # a fake md5
BASE = {('properties', 'P1'): H('a'), ('leases', 'L1'): H('b'), ('lease_tenants', 'LT1'): H('c'),
        ('tenants', 'T1'): H('d'), ('action_items', 'A1'): H('e'), ('audit_log', 'AU1'): H('f')}
# A complete, realistic fixture set: property (with an audit row and an ownership
# version that has no timestamp), owner LLC, unit, tenant, lease, link, billing
# terms and the renewal reminder the lease generates.
FIX = {
    ('properties', 'P9'): {'id': 'P9', 'address': '1 ZMR-TEST-BT Tenancy Check Way'},
    ('llcs', 'O9'): {'id': 'O9', 'name': 'ZMR-TEST-BT Owner LLC'},
    ('property_ownership_interests', 'OI9'): {'id': 'OI9', 'property_id': 'P9', 'llc_id': 'O9', 'recorded_at': 'x'},
    ('property_ownership_versions', 'P9'): {'property_id': 'P9', 'version': 1},
    ('units', 'U9'): {'id': 'U9', 'property_id': 'P9'},
    ('tenants', 'T9'): {'id': 'T9', 'name': 'zmr-test-bt same  name'},
    ('leases', 'L9'): {'id': 'L9', 'property_id': 'P9', 'unit_id': 'U9', 'rent_amount': 1000},
    ('lease_tenants', 'LT9'): {'id': 'LT9', 'lease_id': 'L9', 'tenant_id': 'T9'},
    ('lease_billing_terms', 'L9'): {'lease_id': 'L9'},
    ('action_items', 'A9'): {'id': 'A9', 'lease_id': 'L9', 'property_id': 'P9', 'unit_id': 'U9', 'title': 'Lease renewal'},
    ('audit_log', 'AU9'): {'id': 'AU9', 'table_name': 'properties', 'record_id': 'P9', 'changed_at': 'x'},
}


def run(after_extra=None, changed=None, new_extra=None):
    d = tempfile.mkdtemp()
    after = dict(BASE)
    for k in (changed or []):
        after[k] = H('9')
    rows = dict(FIX); rows.update(new_extra or {})
    for k in rows:
        after.setdefault(k, H('0'))
    for k in (after_extra or []):
        after[k] = H('1')
    fmt = lambda m: ' '.join(f'{t}|{k}|{v}' for (t, k), v in m.items())
    paths = [os.path.join(d, n) for n in ('b', 'a', 'n', 'f')]
    Path(paths[0]).write_text('noise ' + fmt(BASE))
    Path(paths[1]).write_text(fmt(after))
    Path(paths[2]).write_text('{"rows":[[ ' + json.dumps([{'t': t, 'k': k, 'j': j} for (t, k), j in rows.items()]) + ' ]]}')
    out = io.StringIO()
    with redirect_stdout(out):
        code = bp.compare(*paths)
    return code, out.getvalue(), Path(paths[3]).read_text().split()


class Preserve(unittest.TestCase):
    def test_fixtures_including_audit_and_reminder_pass(self):
        code, out, fx = run()
        self.assertEqual(code, 0, out)
        self.assertIn('audit_log|AU9', fx)
        self.assertIn('action_items|A9', fx)
        self.assertIn('property_ownership_versions|P9', fx)  # no timestamp column
        self.assertEqual(len(fx), len(FIX))

    def test_audit_row_about_existing_record_fails(self):
        code, out, _ = run(new_extra={('audit_log', 'AU7'): {'id': 'AU7', 'record_id': 'P1', 'changed_at': 'x'}})
        self.assertEqual(code, 1); self.assertIn('UNEXPLAINED new row: audit_log|AU7', out)

    def test_audit_row_mentioning_fixture_text_but_existing_record_fails(self):
        code, out, _ = run(new_extra={('audit_log', 'AU8'): {'id': 'AU8', 'record_id': 'P1', 'new_value': 'ZMR-TEST-BT', 'changed_at': 'x'}})
        self.assertEqual(code, 1); self.assertIn('UNEXPLAINED new row: audit_log|AU8', out)

    def test_reminder_for_existing_lease_fails(self):
        code, out, _ = run(new_extra={('action_items', 'A7'): {'id': 'A7', 'lease_id': 'L1', 'property_id': 'P9'}})
        self.assertEqual(code, 1); self.assertIn('UNEXPLAINED new row: action_items|A7', out)

    def test_link_from_existing_lease_to_fixture_tenant_fails(self):
        code, out, _ = run(new_extra={('lease_tenants', 'LT7'): {'id': 'LT7', 'lease_id': 'L1', 'tenant_id': 'T9'}})
        self.assertEqual(code, 1); self.assertIn('UNEXPLAINED new row: lease_tenants|LT7', out)

    def test_link_from_fixture_lease_to_existing_tenant_fails(self):
        code, out, _ = run(new_extra={('lease_tenants', 'LT6'): {'id': 'LT6', 'lease_id': 'L9', 'tenant_id': 'T1'}})
        self.assertEqual(code, 1); self.assertIn('UNEXPLAINED new row: lease_tenants|LT6', out)

    def test_changed_existing_rows_fail(self):
        code, out, _ = run(changed=[('leases', 'L1'), ('action_items', 'A1'), ('audit_log', 'AU1')])
        self.assertEqual(code, 1)
        for k in ('leases|L1', 'action_items|A1', 'audit_log|AU1'):
            self.assertIn(f'CHANGED existing row: {k}', out)

    def test_new_row_in_never_fixture_table_or_without_details_fails(self):
        code, out, _ = run(new_extra={('payments', 'PAY1'): {'id': 'PAY1', 'lease_id': 'L9'}}, after_extra=[('invoices', 'INV1')])
        self.assertEqual(code, 1)
        self.assertIn('UNEXPLAINED new row: payments|PAY1', out)
        self.assertIn('UNEXPLAINED new row: invoices|INV1 (no row details)', out)

    def test_pretty_printed_cli_output_is_parsed(self):
        # The real `supabase db query` output: log lines, then an indented JSON
        # document with the aggregate under rows[0].jsonb_agg.
        rows = [{'t': t, 'k': k, 'j': j} for (t, k), j in FIX.items()]
        doc = {'boundary': 'x', 'rows': [{'jsonb_agg': rows}], 'warning': 'untrusted'}
        d = tempfile.mkdtemp(); p = os.path.join(d, 'n')
        Path(p).write_text('Using workdir /x\nInitialising login role...\n' + json.dumps(doc, indent=2))
        self.assertEqual(len(bp.parse_new(p)), len(FIX))

    def test_generated_sql_is_read_only_and_covers_tables(self):
        guard_ok = lambda q: re.match(r'^\s*(select|with)\s', q, re.I) and not re.search(
            r';|\b(insert|update|delete|alter|drop|create|grant|revoke|truncate|copy|call|do)\b', q, re.I)
        fp, new = bp.fp_sql(), bp.new_sql('2026-10-02T09:00:00Z')
        self.assertTrue(guard_ok(fp)); self.assertTrue(guard_ok(new))
        for t in ('action_items', 'audit_log', 'property_ownership_versions'):
            self.assertIn(f' from {t} x', fp); self.assertIn(f' from {t} x', new)
        self.assertIn("(j->>'changed_at')::timestamptz", new)
        self.assertIn("(j->>'recorded_at')::timestamptz", new)


if __name__ == '__main__':
    unittest.main(verbosity=2)
