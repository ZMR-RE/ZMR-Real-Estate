-- O1-A ownership foundation — the only write path for
-- property_ownership_interests / llc_membership_interests. Both tables
-- have RLS with a SELECT policy only (see the previous migration) — there
-- is intentionally no INSERT/UPDATE/DELETE policy for the `authenticated`
-- role, so these SECURITY DEFINER functions are the sole way to change
-- ownership/membership data. This is a deliberate database-level
-- enforcement of "no bypass that avoids the correction/reason
-- requirement" (D1/I4), not just an application convention that a future
-- caller could forget to follow.
--
-- Being SECURITY DEFINER is not itself an authorization check — each
-- function explicitly verifies is_account_member() against the current
-- auth.uid() before doing anything, exactly as if RLS were still active.
-- A SECURITY DEFINER function that skipped this check would be a real
-- privilege-escalation bug; it does not skip it here.
--
-- Each call is a single statement from the client (one supabase.rpc()
-- call), and everything inside runs in one implicit transaction — this is
-- what makes a multi-owner rebalance (e.g. 48/52 -> 50/50) atomic: the
-- validation is computed entirely from the caller's desired end state
-- (p_entries) before any row is touched, so there is never an
-- observable, partially-applied intermediate state.
--
-- Corrected in this revision (checkpoint review finding): the original
-- version of this function inferred "complete" merely from "every
-- current entry has a known percentage," which was wrong — a single
-- owner entered at 48% with nothing else on file does not mean the
-- allocation is finished; it may simply mean the remaining owner(s)
-- haven't been entered yet. Completeness is now an explicit
-- `p_allocation_status` argument the caller must assert on every save
-- ('incomplete' or 'complete'), never inferred from the entries
-- themselves. 'complete' is validated strictly (every current owner must
-- have a known percentage, summing to exactly 100); 'incomplete' only
-- requires the ordinary per-entry/aggregate-ceiling rules. See
-- property_ownership_versions.allocation_status /
-- property_ownership_summary in the previous migration for where this is
-- stored and read back.

-- Shared validation: entry shape, percentage bounds/precision, duplicate
-- owners, and the aggregate rules from I1. Used by both mutation
-- functions below so the two rule sets can never drift apart from each
-- other.
create or replace function _validate_ownership_entries(
  p_entries jsonb,
  p_allocation_status text,
  out known_sum numeric,
  out unknown_count int,
  out entry_count int,
  out owner_ids uuid[]
)
language plpgsql
as $$
declare
  v_entry jsonb;
  v_id uuid;
  v_pct numeric(5,2);
begin
  if p_allocation_status not in ('incomplete', 'complete') then
    raise exception 'Allocation status must be either incomplete or complete.' using errcode = 'ZM003';
  end if;

  known_sum := 0;
  unknown_count := 0;
  entry_count := 0;
  owner_ids := '{}';

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    entry_count := entry_count + 1;
    v_id := (v_entry->>'owner_id')::uuid;
    if v_id is null then
      raise exception 'Each ownership entry needs an owner id.' using errcode = 'ZM003';
    end if;
    if v_id = any(owner_ids) then
      raise exception 'Each owner can appear only once in a single ownership set.' using errcode = 'ZM003';
    end if;
    owner_ids := owner_ids || v_id;

    if (v_entry ? 'percentage') is false or v_entry->>'percentage' is null then
      unknown_count := unknown_count + 1;
    else
      v_pct := round((v_entry->>'percentage')::numeric, 2);
      if v_pct <= 0 or v_pct > 100 then
        raise exception 'Percentage must be greater than 0 and no more than 100 (got %).', v_pct
          using errcode = 'ZM003';
      end if;
      known_sum := known_sum + v_pct;
    end if;
  end loop;

  -- Applies regardless of allocation_status: known percentages may never
  -- sum past 100, complete or not.
  if known_sum > 100 then
    raise exception 'Known ownership percentages cannot exceed 100%% (currently %).', known_sum
      using errcode = 'ZM003';
  end if;

  -- Only a 'complete' assertion demands full knowledge and an exact
  -- 100% total. An 'incomplete' set is valid with any number of unknown
  -- percentages and any known sum from 0 up to (and not exceeding) 100 —
  -- this is what lets "just one owner at 48%, more to come" be saved
  -- honestly instead of being rejected or silently mislabeled complete.
  if p_allocation_status = 'complete' then
    if entry_count = 0 then
      raise exception 'A complete allocation must include at least one owner.' using errcode = 'ZM003';
    end if;
    if unknown_count > 0 then
      raise exception 'A complete allocation cannot include an owner with an unknown percentage.' using errcode = 'ZM003';
    end if;
    if known_sum <> 100 then
      raise exception 'A complete allocation must total exactly 100%% (currently %).', known_sum
        using errcode = 'ZM003';
    end if;
  end if;
end;
$$;

-- p_entries shape: jsonb array of {"owner_id": uuid, "percentage": number|null, "effective_date": "YYYY-MM-DD"|null}
-- representing the COMPLETE desired set of currently-effective owners for
-- the property. Any existing current interest whose owner_id is absent
-- from this array is treated as removed. p_allocation_status ('incomplete'
-- | 'complete') is a required, explicit assertion — see the file header.
create or replace function replace_property_ownership_interests(
  p_property_id uuid,
  p_entries jsonb,
  p_reason text,
  p_expected_version bigint,
  p_allocation_status text default 'incomplete'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_current_version bigint;
  v_known_sum numeric;
  v_unknown_count int;
  v_entry_count int;
  v_owner_ids uuid[];
  v_entry jsonb;
  v_llc_id uuid;
  v_percentage numeric(5,2);
  v_effective_date date;
  v_old record;
  v_new_id uuid;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required for every ownership change.' using errcode = 'ZM003';
  end if;

  select account_id into v_account_id from properties where id = p_property_id;
  if v_account_id is null then
    raise exception 'Property not found.' using errcode = 'ZM004';
  end if;
  if not is_account_member(v_account_id) then
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;

  select * into v_known_sum, v_unknown_count, v_entry_count, v_owner_ids
  from _validate_ownership_entries(p_entries, p_allocation_status);

  if exists (
    select 1 from unnest(v_owner_ids) as owner_id
    where not exists (select 1 from llcs where id = owner_id and account_id = v_account_id)
  ) then
    raise exception 'One or more owners are not part of this account.' using errcode = 'ZM002';
  end if;

  insert into property_ownership_versions (property_id, account_id, version, allocation_status)
  values (p_property_id, v_account_id, 0, 'incomplete')
  on conflict (property_id) do nothing;

  select version into v_current_version
  from property_ownership_versions
  where property_id = p_property_id
  for update;

  if v_current_version is distinct from p_expected_version then
    raise exception 'Ownership data has changed since you loaded it. Refresh and try again.'
      using errcode = 'ZM001';
  end if;

  for v_old in
    select * from property_ownership_interests
    where property_id = p_property_id and is_current
  loop
    if not (v_old.llc_id = any(v_owner_ids)) then
      update property_ownership_interests
      set is_current = false, end_date = current_date
      where id = v_old.id;

      insert into property_ownership_corrections
        (account_id, property_id, llc_id, interest_id, change_type, previous_percentage, new_percentage, reason, corrected_by)
      values
        (v_account_id, p_property_id, v_old.llc_id, v_old.id, 'removed', v_old.percentage, null, p_reason, auth.uid());
    end if;
  end loop;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    v_llc_id := (v_entry->>'owner_id')::uuid;
    v_percentage := case when v_entry->>'percentage' is null then null else round((v_entry->>'percentage')::numeric, 2) end;
    v_effective_date := case when v_entry->>'effective_date' is null then null else (v_entry->>'effective_date')::date end;

    select * into v_old
    from property_ownership_interests
    where property_id = p_property_id and llc_id = v_llc_id and is_current;

    if v_old.id is null then
      insert into property_ownership_interests
        (account_id, property_id, llc_id, percentage, effective_date, is_current, recorded_by)
      values
        (v_account_id, p_property_id, v_llc_id, v_percentage, v_effective_date, true, auth.uid())
      returning id into v_new_id;

      insert into property_ownership_corrections
        (account_id, property_id, llc_id, interest_id, change_type, previous_percentage, new_percentage, reason, corrected_by)
      values
        (v_account_id, p_property_id, v_llc_id, v_new_id, 'added', null, v_percentage, p_reason, auth.uid());

    elsif v_old.percentage is distinct from v_percentage then
      update property_ownership_interests
      set is_current = false, end_date = coalesce(v_effective_date, current_date)
      where id = v_old.id;

      insert into property_ownership_interests
        (account_id, property_id, llc_id, percentage, effective_date, is_current, recorded_by)
      values
        (v_account_id, p_property_id, v_llc_id, v_percentage, coalesce(v_effective_date, v_old.effective_date, current_date), true, auth.uid())
      returning id into v_new_id;

      update property_ownership_interests set superseded_by_id = v_new_id where id = v_old.id;

      insert into property_ownership_corrections
        (account_id, property_id, llc_id, interest_id, change_type, previous_percentage, new_percentage, reason, corrected_by)
      values
        (v_account_id, p_property_id, v_llc_id, v_new_id, 'percentage_changed', v_old.percentage, v_percentage, p_reason, auth.uid());
    end if;
  end loop;

  update property_ownership_versions
  set version = version + 1, allocation_status = p_allocation_status
  where property_id = p_property_id
  returning version into v_current_version;

  return v_current_version;
end;
$$;

revoke all on function replace_property_ownership_interests(uuid, jsonb, text, bigint, text) from public;
grant execute on function replace_property_ownership_interests(uuid, jsonb, text, bigint, text) to authenticated;

-- Entity membership counterpart — identical shape, scoped by llc_id
-- (the entity) instead of property_id, with member_llc_id (a person or
-- another entity) in place of the property's owner llc_id.
create or replace function replace_llc_membership_interests(
  p_llc_id uuid,
  p_entries jsonb,
  p_reason text,
  p_expected_version bigint,
  p_allocation_status text default 'incomplete'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_current_version bigint;
  v_known_sum numeric;
  v_unknown_count int;
  v_entry_count int;
  v_member_ids uuid[];
  v_entry jsonb;
  v_member_id uuid;
  v_percentage numeric(5,2);
  v_effective_date date;
  v_old record;
  v_new_id uuid;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required for every membership change.' using errcode = 'ZM003';
  end if;

  select account_id into v_account_id from llcs where id = p_llc_id;
  if v_account_id is null then
    raise exception 'Entity not found.' using errcode = 'ZM004';
  end if;
  if not is_account_member(v_account_id) then
    raise exception 'Not authorized for this account.' using errcode = 'ZM002';
  end if;

  select * into v_known_sum, v_unknown_count, v_entry_count, v_member_ids
  from _validate_ownership_entries(p_entries, p_allocation_status);

  if p_llc_id = any(v_member_ids) then
    raise exception 'An entity cannot be its own member.' using errcode = 'ZM003';
  end if;

  if exists (
    select 1 from unnest(v_member_ids) as member_id
    where not exists (select 1 from llcs where id = member_id and account_id = v_account_id)
  ) then
    raise exception 'One or more members are not part of this account.' using errcode = 'ZM002';
  end if;

  insert into llc_membership_versions (llc_id, account_id, version, allocation_status)
  values (p_llc_id, v_account_id, 0, 'incomplete')
  on conflict (llc_id) do nothing;

  select version into v_current_version
  from llc_membership_versions
  where llc_id = p_llc_id
  for update;

  if v_current_version is distinct from p_expected_version then
    raise exception 'Membership data has changed since you loaded it. Refresh and try again.'
      using errcode = 'ZM001';
  end if;

  for v_old in
    select * from llc_membership_interests
    where llc_id = p_llc_id and is_current
  loop
    if not (v_old.member_llc_id = any(v_member_ids)) then
      update llc_membership_interests
      set is_current = false, end_date = current_date
      where id = v_old.id;

      insert into llc_membership_corrections
        (account_id, llc_id, member_llc_id, interest_id, change_type, previous_percentage, new_percentage, reason, corrected_by)
      values
        (v_account_id, p_llc_id, v_old.member_llc_id, v_old.id, 'removed', v_old.percentage, null, p_reason, auth.uid());
    end if;
  end loop;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    v_member_id := (v_entry->>'owner_id')::uuid;
    v_percentage := case when v_entry->>'percentage' is null then null else round((v_entry->>'percentage')::numeric, 2) end;
    v_effective_date := case when v_entry->>'effective_date' is null then null else (v_entry->>'effective_date')::date end;

    select * into v_old
    from llc_membership_interests
    where llc_id = p_llc_id and member_llc_id = v_member_id and is_current;

    if v_old.id is null then
      insert into llc_membership_interests
        (account_id, llc_id, member_llc_id, percentage, effective_date, is_current, recorded_by)
      values
        (v_account_id, p_llc_id, v_member_id, v_percentage, v_effective_date, true, auth.uid())
      returning id into v_new_id;

      insert into llc_membership_corrections
        (account_id, llc_id, member_llc_id, interest_id, change_type, previous_percentage, new_percentage, reason, corrected_by)
      values
        (v_account_id, p_llc_id, v_member_id, v_new_id, 'added', null, v_percentage, p_reason, auth.uid());

    elsif v_old.percentage is distinct from v_percentage then
      update llc_membership_interests
      set is_current = false, end_date = coalesce(v_effective_date, current_date)
      where id = v_old.id;

      insert into llc_membership_interests
        (account_id, llc_id, member_llc_id, percentage, effective_date, is_current, recorded_by)
      values
        (v_account_id, p_llc_id, v_member_id, v_percentage, coalesce(v_effective_date, v_old.effective_date, current_date), true, auth.uid())
      returning id into v_new_id;

      update llc_membership_interests set superseded_by_id = v_new_id where id = v_old.id;

      insert into llc_membership_corrections
        (account_id, llc_id, member_llc_id, interest_id, change_type, previous_percentage, new_percentage, reason, corrected_by)
      values
        (v_account_id, p_llc_id, v_member_id, v_new_id, 'percentage_changed', v_old.percentage, v_percentage, p_reason, auth.uid());
    end if;
  end loop;

  update llc_membership_versions
  set version = version + 1, allocation_status = p_allocation_status
  where llc_id = p_llc_id
  returning version into v_current_version;

  return v_current_version;
end;
$$;

revoke all on function replace_llc_membership_interests(uuid, jsonb, text, bigint, text) from public;
grant execute on function replace_llc_membership_interests(uuid, jsonb, text, bigint, text) to authenticated;

revoke all on function _validate_ownership_entries(jsonb, text) from public;
grant execute on function _validate_ownership_entries(jsonb, text) to authenticated;
