-- ZMR Real Estate — Migrate tasks into action_items (Tasks/2.2 consolidation
-- into Action Queue/10.2). action_items already covers everything tasks did
-- (title, notes, due_date, recurrence, completed, completed_at) plus more
-- (unit_id, assignee) that tasks never had — this is a pure data move, not
-- a schema change. tasks.task_type maps to action_items.type: both are
-- backed by the same 'task_type' pick-list (see ActionItemForm.tsx /
-- TaskForm.tsx), so the values carry over as-is. tasks.vendor_id has no
-- equivalent column and is dropped silently: it was never wired into
-- TaskForm's UI, so no real task could have had a non-null value there.
--
-- id, created_at, and updated_at are preserved as-is (not just the fields
-- the roadmap item named) so a moved row keeps its original identity and
-- history rather than looking newly created.
--
-- This is step 1 of 2: the tasks table itself is dropped in a separate,
-- later migration, only after confirming (outside this migration) that
-- every row landed correctly and nothing in the app still queries tasks.
do $$
declare
  v_tasks_count integer;
  v_inserted_count integer;
begin
  select count(*) into v_tasks_count from tasks;

  insert into action_items (
    id, account_id, property_id, unit_id, type, title, notes, assignee,
    due_date, recurrence, completed, completed_at, created_at, updated_at
  )
  select
    id, account_id, property_id, null, task_type, title, notes, null,
    due_date, recurrence, completed, completed_at, created_at, updated_at
  from tasks;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count != v_tasks_count then
    raise exception 'Task migration row count mismatch: % tasks rows, % inserted into action_items', v_tasks_count, v_inserted_count;
  end if;
end $$;
