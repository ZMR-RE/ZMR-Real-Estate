-- Units/Lease/Tenant rebuild, Stage 8 — seed 'Lease renewal' into the
-- task_type pick list for every account, same carrying-forward-an-
-- explicit-taxonomy justification as document_type/unit_status's own
-- seeds: the user's own item 6 named this exact feature ("a lease
-- within 60 days of its end date auto-generates a renewal-reminder
-- action item"), so this isn't a guess at a taxonomy — it's the literal
-- type of the one new auto-generated action item this rebuild creates.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'task_type', 'Lease renewal'
from accounts a
on conflict (account_id, list_name, value) do nothing;
