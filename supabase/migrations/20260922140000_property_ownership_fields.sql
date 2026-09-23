-- Roadmap 7.39 (3) — Ownership subsection: Owner name, Contact phone
-- (new field, alongside the existing contact_email), Deed document.
alter table properties add column owner_name text;
alter table properties add column contact_phone text;

-- Deed document reuses the existing documents architecture (2.5) and
-- its account-editable 'document_type' pick list rather than a new
-- storage system or a fixed category — same precedent as 'Photos'
-- (7.32 (6)). 'Deed' isn't one of the 7 categories that list was
-- originally seeded with, so it's added here.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'document_type', 'Deed'
from accounts a
on conflict (account_id, list_name, value) do nothing;
