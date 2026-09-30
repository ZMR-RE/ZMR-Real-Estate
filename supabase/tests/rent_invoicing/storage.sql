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
delete from storage.objects where name like '%/Invoices/SRP-INV-000001%';
update storage.objects set name = name || '.x' where name like '%/Invoices/SRP-INV-000001%';
select a('issued invoice object survives member delete/overwrite', $q$(select count(*) = 1 from storage.objects where name = 'a0000000-0000-0000-0000-00000000000a/a1000000-0000-0000-0000-000000000002/Invoices/SRP-INV-000001_2026-10_Unit-A.pdf')$q$);
delete from storage.objects where name like '%/Receipts/ordinary-control.pdf';
select a('control: an ordinary document object is still deletable', $q$(select count(*) = 0 from storage.objects where name like '%/Receipts/ordinary-control.pdf')$q$);
