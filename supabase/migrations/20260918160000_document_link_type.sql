-- Roadmap 7.17 (revised) — Documents & links' create UI moved from
-- Property Overview into the Activity & Documents tab, and a new link
-- type is added: a Google Drive folder link, distinct from a plain
-- document link. Nullable link_type keeps every existing row (all
-- currently null) valid; the check constraint restricts it to the one
-- known distinct type rather than leaving it a freeform string.
alter table documents
  add column link_type text check (link_type is null or link_type = 'drive_folder');
