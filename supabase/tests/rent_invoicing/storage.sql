-- Storage-policy SQL checks (T4). Proves the restrictive policies' logic in a
-- disposable Postgres ONLY — not that the hosted Storage API enforces them.
\set QUIET on
reset role;
-- Hosted Supabase grants signed-in users table privileges on storage.objects
-- (row access is then decided by policies); the minimal local stand-in
-- doesn't, so grant the same here.
grant select, insert, update, delete on storage.objects to authenticated;
insert into storage.objects (bucket_id, name) values
 ('documents', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_2026-10_Unit-A.pdf'),
 ('documents', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Receipts/ordinary-control.pdf');
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
-- Delete, overwrite (an upsert updates the existing row in place) and move
-- (a rename updates name) are each attempted and checked separately.
delete from storage.objects where name like '%/Invoices/SRP-INV-000001%';
select a('stored invoice PDF: delete removes nothing', $q$(select count(*) = 1 from storage.objects where name = 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_2026-10_Unit-A.pdf')$q$);
update storage.objects set owner = 'aaaaaaaa-0000-0000-0000-00000000000a' where name like '%/Invoices/SRP-INV-000001%';
select a('stored invoice PDF: overwrite (in-place update) changes nothing', $q$(select count(*) = 1 and bool_and(owner is null) from storage.objects where name = 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_2026-10_Unit-A.pdf')$q$);
update storage.objects set name = replace(name, '/Invoices/', '/Other/') where name like '%/Invoices/SRP-INV-000001%';
select a('stored invoice PDF: move (rename) is refused — still at its path, nothing under Other/', $q$(select count(*) = 1 from storage.objects where name = 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_2026-10_Unit-A.pdf') and not exists (select 1 from storage.objects where name like '%/Other/SRP-INV-000001%')$q$);
delete from storage.objects where name like '%/Receipts/ordinary-control.pdf';
select a('control: an ordinary document object is still deletable', $q$(select count(*) = 0 from storage.objects where name like '%/Receipts/ordinary-control.pdf')$q$);

-- Owner-only uploads into a property's Invoices folder
reset role;
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-00000000000c';
select t('manager can''t upload an invoice PDF', $q$insert into storage.objects (bucket_id, name) values ('documents', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000001/Invoices/manager.pdf')$q$, '42501');
select t('control: manager can still upload an ordinary document', $q$insert into storage.objects (bucket_id, name) values ('documents', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000001/Receipts/manager-control.pdf')$q$, 'ok');
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
select t('owner can upload an invoice PDF', $q$insert into storage.objects (bucket_id, name) values ('documents', 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000001/Invoices/owner.pdf')$q$, 'ok');
