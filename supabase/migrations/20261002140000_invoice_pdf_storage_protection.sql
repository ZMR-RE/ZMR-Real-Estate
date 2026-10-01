-- T4 Stage 1 — protect issued invoice PDF BYTES, not only the database
-- snapshot.
--
-- 1. attach_invoice_pdf is the only way to link a stored PDF to an issued
--    invoice. It checks the path belongs to the invoice's account/property,
--    and records the file's SHA-256 digest and size in the immutable
--    invoice_events history, so any later change to the bytes is detectable.
-- 2. Restrictive Storage policies: once a `documents` row links an object to
--    an invoice, members can neither delete nor overwrite (upsert/update)
--    that object in the `documents` bucket. Restrictive policies are ANDed
--    with the bucket's existing permissive policies, which stay unchanged.
--
-- A disposable Postgres can evaluate these policies' SQL but does NOT prove
-- the hosted Storage service enforces them on its API paths — that needs
-- verification in Practice (upload, overwrite, delete attempts through the
-- Storage API as a signed-in member) before release.

create or replace function attach_invoice_pdf(p_invoice_id uuid, p_storage_path text, p_file_size bigint, p_sha256 text)
returns uuid language plpgsql set search_path = public as $$
declare inv invoices; v_doc uuid;
begin
  select * into inv from invoices where id = p_invoice_id;
  if inv.id is null then raise exception 'Invoice not found' using errcode = 'ZM323'; end if;
  perform invoice_require_owner(inv.account_id);
  if p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'A SHA-256 digest (64 lowercase hex characters) is required' using errcode = 'ZM345';
  end if;
  -- The object must be THIS invoice's own file: <account>/<property>/Invoices/<number>_…
  if inv.number is null or not starts_with(p_storage_path, inv.account_id::text || '/' || inv.property_id::text || '/Invoices/' || inv.number || '_') then
    raise exception 'The PDF must be stored under this invoice''s account and property' using errcode = 'ZM346';
  end if;
  if p_file_size is null or p_file_size <= 0 then
    raise exception 'The stored PDF is empty' using errcode = 'ZM345';
  end if;
  perform set_config('app.invoice_op', 'on', true);
  insert into documents (account_id, property_id, category, storage_path, file_size, invoice_id)
  values (inv.account_id, inv.property_id, 'Invoices', p_storage_path, p_file_size, inv.id)
  returning id into v_doc;
  insert into invoice_events (account_id, invoice_id, event, version, detail)
  values (inv.account_id, inv.id, 'pdf_attached', inv.version,
          jsonb_build_object('document_id', v_doc, 'storage_path', p_storage_path, 'file_size', p_file_size, 'sha256', p_sha256));
  perform set_config('app.invoice_op', 'off', true);
  return v_doc;
end $$;

create policy "issued invoice PDFs cannot be deleted"
  on storage.objects as restrictive for delete to authenticated
  using (
    bucket_id <> 'documents'
    or not exists (select 1 from public.documents d where d.storage_path = storage.objects.name and d.invoice_id is not null)
  );

create policy "issued invoice PDFs cannot be overwritten"
  on storage.objects as restrictive for update to authenticated
  using (
    bucket_id <> 'documents'
    or not exists (select 1 from public.documents d where d.storage_path = storage.objects.name and d.invoice_id is not null)
  );
