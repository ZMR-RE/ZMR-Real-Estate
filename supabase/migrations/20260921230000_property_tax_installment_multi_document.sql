-- Roadmap 9.5 revision — support multiple documents per tax
-- installment (e.g. the original bill AND a separate payment
-- confirmation), not one. The old design had property_tax_installments
-- hold a single installment_N_document_id FK per slot; that can't
-- express "many documents for installment 1". Flipped the relationship:
-- documents now points back at which installment (and which of its two
-- slots) it belongs to, the same way it already points at
-- transaction_id/mortgage_id — a document row is cheap to add more of,
-- an FK column is not.
--
-- installment_1_document_id/installment_2_document_id (added by
-- 20260910230000) are kept in place — never dropped, per CLAUDE.md's
-- data-safety rule — but backfilled below and never written by the app
-- again.
alter table documents add column property_tax_installment_id uuid references property_tax_installments(id) on delete cascade;
alter table documents add column tax_installment_number smallint check (tax_installment_number in (1, 2));

update documents d
set property_tax_installment_id = pti.id, tax_installment_number = 1
from property_tax_installments pti
where pti.installment_1_document_id = d.id;

update documents d
set property_tax_installment_id = pti.id, tax_installment_number = 2
from property_tax_installments pti
where pti.installment_2_document_id = d.id;
