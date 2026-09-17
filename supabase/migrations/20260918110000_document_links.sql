-- Roadmap 7.17 — Property Overview's freeform Documents/links section:
-- an entry here is either an uploaded file (existing storage_path/
-- file_size path) or a pasted reference link (e.g. a Google Drive URL),
-- never both. Extending the existing documents table rather than adding
-- a second table, per CLAUDE.md's Single source of truth rule — an
-- entry added here shows up in the Activity & Documents tab's document
-- list too, for free.

alter table documents alter column storage_path drop not null;
alter table documents alter column file_size drop not null;

alter table documents add column link_url text;
alter table documents add column label text;

alter table documents add constraint documents_file_or_link_check check (
  (storage_path is not null and file_size is not null and link_url is null)
  or
  (storage_path is null and file_size is null and link_url is not null)
);
