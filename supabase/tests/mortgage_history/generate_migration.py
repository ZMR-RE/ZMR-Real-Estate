#!/usr/bin/env python3
"""Generates supabase/migrations/20261005100000_mortgage_history_entries.sql (option B, H2; T1).

The two normal insert functions are COPIED byte-for-byte from the T3-cleared integrity migration (20261004100000) with
exactly one inserted statement each (the duplicate rule), placed after the loan lock and the account/loan checks and
before any validation or balance update (T3 condition 3). Re-run to regenerate; run.sh checks the result is current.
"""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[3]
INTEGRITY = (ROOT / 'supabase/migrations/20261004100000_mortgage_balance_integrity.sql').read_text()
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'supabase/migrations/20261005100000_mortgage_history_entries.sql'

def fn(name):
    m = re.search(rf'(create or replace function {name}\(\)\n.*?\n\$\$;\n)', INTEGRITY, re.S)
    assert m, name
    return m.group(1)

ANCHOR_P = "    raise exception 'A new payment can only be recorded against the property''s active mortgage.' using errcode = 'ZM5M1';\n  end if;\n"
ANCHOR_E = "    raise exception 'A new escrow entry can only be recorded against the property''s active mortgage.' using errcode = 'ZM5M1';\n  end if;\n"
DUP_P = "  perform public.mortgage_enforce_duplicate_rule('payment', new.account_id, new.property_id, l.id, new.payment_date, new.amount, null, new.duplicate_ack_matches);\n"
DUP_E = "  perform public.mortgage_enforce_duplicate_rule('escrow', new.account_id, new.property_id, l.id, new.transaction_date, new.amount, new.transaction_type, new.duplicate_ack_matches);\n"
pay, esc = fn('mortgage_payment_apply_locked'), fn('mortgage_escrow_apply_locked')
assert pay.count(ANCHOR_P) == 1 and esc.count(ANCHOR_E) == 1
pay2, esc2 = pay.replace(ANCHOR_P, ANCHOR_P + DUP_P), esc.replace(ANCHOR_E, ANCHOR_E + DUP_E)

TEMPLATE = (pathlib.Path(__file__).parent / 'migration_template.sql').read_text()
OUT.write_text(TEMPLATE.replace('--@@PAYMENT_APPLY_LOCKED@@\n', pay2).replace('--@@ESCROW_APPLY_LOCKED@@\n', esc2))
print(f'wrote {OUT}')
