-- ZMR Real Estate — Drop tasks table (Tasks/2.2 -> Action Queue/10.2
-- consolidation, step 2 of 2). Applied only after confirming, outside
-- this migration, that 20260918100000_migrate_tasks_to_action_items.sql
-- moved every row correctly (0 tasks rows existed at migration time,
-- verified before and after against the live database) and that no
-- frontend code queries tasks anymore (Task Engine retired in this same
-- commit — see src/modules/tasks/ removal).
drop table tasks;
