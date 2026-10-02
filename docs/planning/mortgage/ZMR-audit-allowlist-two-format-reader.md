# audit_log table-name allowlist: what was affected, and the reader to use from now on (T1, 2026-10-02)

## Confirmation (T3 request)

**The parser issue affected only H2's extension of the constraint, not the integrity migration.**

Evidence: `evidence/allowlist-forms-before-after-integrity-and-h2.txt`, from a disposable Postgres 17 with every migration applied in order.

| Stage | Constraint form | Names |
|---|---|---|
| Before `20261004100000` (integrity) | `ARRAY['properties'::text, …]` | 8 |
| After integrity | `'{contact_links,…}'::text[]` (written by integrity's `%L::text[]`) | 10: **all 8 kept**, plus `mortgage_payments` and `mortgage_escrow_transactions` |
| After H2 `20261005100000` (fixed reader) | `'{…}'::text[]` | 12: all 10 kept, plus the two history tables |

- **Integrity was correct.** Its single-format reader handled the `ARRAY[...]` form it actually met.
- **H2, as first written,** copied that reader. On the `'{…}'` form the integrity migration had produced, it would have read **zero** names and rewritten the constraint with only H2's two tables. That would have refused audit rows for every existing table, `mortgage_details` included.
- **Found by** T3 condition 4's test before any application. Practice and production never ran it.

## The guarded two-format reader (use for every future change to this constraint)

```sql
do $$
declare
  existing text[];
  def text;
begin
  select pg_get_constraintdef(oid) into def from pg_constraint
   where conrelid = 'public.audit_log'::regclass and conname = 'audit_log_table_name_check';
  -- Read BOTH forms Postgres may show: ARRAY['a'::text, ...] and '{a,b,...}'::text[].
  if def ~ '''\{' then
    existing := array(select btrim(x, ' "') from unnest(string_to_array(substring(def from '''\{([^}]*)\}'''), ',')) as x);
  else
    select array_agg(distinct m[1]) into existing from regexp_matches(coalesce(def, ''), '''([a-z_]+)''', 'g') as m;
  end if;
  -- Guards: never rewrite from an unreadable or incomplete list (that would drop existing names).
  if def is not null and coalesce(array_length(existing, 1), 0) = 0 then
    raise exception 'audit_log_table_name_check could not be read; refusing to rewrite it: %', def;
  end if;
  if def is not null and not (existing @> array['mortgage_details', 'mortgage_payments', 'mortgage_escrow_transactions']) then
    raise exception 'audit_log_table_name_check is missing expected names; refusing to rewrite it: %', def;
  end if;
  existing := array(select distinct x from unnest(coalesce(existing, '{}') || array['<new_table>']) as x order by 1);
  if def is not null then
    execute 'alter table public.audit_log drop constraint audit_log_table_name_check';
  end if;
  execute format('alter table public.audit_log add constraint audit_log_table_name_check check (table_name = any (%L::text[]))', existing);
end;
$$;
```

**Rules for future migrations:**
1. **Copy this block,** never an older single-format one.
2. **Update the guard's expected names** to what must exist at that point, for example add the history tables once H2 has shipped.
3. **Ship a test with it:**
   - an independent parse before and after (no name dropped, exactly the new names added);
   - every previously allowed name still accepts an audit row.
   - Pattern: `supabase/tests/mortgage_history/run.sh`, section "T3 condition 4".
