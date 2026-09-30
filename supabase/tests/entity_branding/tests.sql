-- T4 entity branding checks, as a signed-in member (RLS applies).
\set QUIET on
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
\set E '''e1000000-0000-0000-0000-000000000001'''
\set A '''a0000000-0000-0000-0000-00000000000a'''

select a('contrast maths: black on white is 21:1', $q$round(hex_contrast('#000000', '#FFFFFF'), 1) = 21.0$q$);
select a('tint toward white', $q$hex_tint('#000000', 1) = '#FFFFFF' and hex_tint('#123456', 0) = '#123456'$q$);
select t('branding with standard colours', $q$insert into entity_document_branding (entity_id, account_id, reply_to_email, payment_instructions) values ('e1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','billing@example.test','Zelle to billing@example.test')$q$, 'ok');
select t('one branding row per entity (no second issuer record)', $q$insert into entity_document_branding (entity_id, account_id) values ('e1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a')$q$, '23505');
select t('readable colours accepted', $q$update entity_document_branding set heading_color = '#1F4E79', accent_color = '#C99730', highlight_color = '#1F4E79', secondary_color = '#5B6472' where entity_id = 'e1000000-0000-0000-0000-000000000001'$q$, 'ok');
select a('version bumps on save', $q$(select version = 2 from entity_document_branding where entity_id = 'e1000000-0000-0000-0000-000000000001')$q$);
select t('too-light heading refused', $q$update entity_document_branding set heading_color = '#FFE066' where entity_id = 'e1000000-0000-0000-0000-000000000001'$q$, 'ZM352');
select t('too-light secondary text refused', $q$update entity_document_branding set secondary_color = '#BBBBBB' where entity_id = 'e1000000-0000-0000-0000-000000000001'$q$, 'ZM352');
select t('accent band that would hide labels refused', $q$update entity_document_branding set accent_color = '#5B6472', secondary_color = '#767676' where entity_id = 'e1000000-0000-0000-0000-000000000001'$q$, 'ZM352');
select t('malformed colour refused', $q$update entity_document_branding set heading_color = 'navy' where entity_id = 'e1000000-0000-0000-0000-000000000001'$q$, 'ZM355');
select t('paper size limited to Letter/A4', $q$update entity_document_branding set paper_size = 'legal' where entity_id = 'e1000000-0000-0000-0000-000000000001'$q$, '23514');

-- Logos: versioned, insert-only, stored under the entity's folder
select t('logo outside the entity folder refused', $q$insert into entity_logo_versions (account_id, entity_id, storage_path, sha256, format, width, height, byte_size) values ('a0000000-0000-0000-0000-00000000000a','e1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a/other/logo.png', repeat('a',64), 'PNG', 240, 80, 431)$q$, 'ZM354');
select t('logo over 1 MB refused', $q$insert into entity_logo_versions (account_id, entity_id, storage_path, sha256, format, width, height, byte_size) values ('a0000000-0000-0000-0000-00000000000a','e1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a/entity-branding/e1000000-0000-0000-0000-000000000001/big.png', repeat('a',64), 'PNG', 240, 80, 2000000)$q$, '23514');
insert into entity_logo_versions (id, account_id, entity_id, storage_path, sha256, format, width, height, byte_size) values
 ('10000000-0000-0000-0000-000000000001', :A, :E, 'a0000000-0000-0000-0000-00000000000a/entity-branding/e1000000-0000-0000-0000-000000000001/v1.png', repeat('a', 64), 'PNG', 240, 80, 431);
select t('set current logo', $q$update entity_document_branding set current_logo_id = '10000000-0000-0000-0000-000000000001' where entity_id = 'e1000000-0000-0000-0000-000000000001'$q$, 'ok');
delete from entity_logo_versions where id = '10000000-0000-0000-0000-000000000001';
update entity_logo_versions set width = 1 where id = '10000000-0000-0000-0000-000000000001';
select a('logo versions can''t be deleted or edited by members', $q$(select count(*) = 1 and min(width) = 240 from entity_logo_versions where id = '10000000-0000-0000-0000-000000000001')$q$);

-- Storage: logo files permanent; other documents unaffected (policy SQL only)
reset role;
insert into storage.objects (bucket_id, name) values
 ('documents', 'a0000000-0000-0000-0000-00000000000a/entity-branding/e1000000-0000-0000-0000-000000000001/v1.png'),
 ('documents', 'a0000000-0000-0000-0000-00000000000a/prop/Receipts/control.pdf');
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
delete from storage.objects where name like '%/entity-branding/%';
update storage.objects set name = name || '.x' where name like '%/entity-branding/%';
select a('logo file survives member delete/overwrite', $q$(select count(*) = 1 from storage.objects where name = 'a0000000-0000-0000-0000-00000000000a/entity-branding/e1000000-0000-0000-0000-000000000001/v1.png')$q$);
delete from storage.objects where name like '%/Receipts/control.pdf';
select a('control: ordinary document still deletable', $q$(select count(*) = 0 from storage.objects where name like '%/Receipts/control.pdf')$q$);

-- Isolation
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-00000000000b';
select a('other account sees no branding or logos', $q$(select count(*) from entity_document_branding) + (select count(*) from entity_logo_versions) = 0$q$);
select t('other account cannot brand A''s entity', $q$insert into entity_document_branding (entity_id, account_id) values ('e1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b')$q$, 'ZM350');
