-- Prep work for roadmap 7.15 (Action Queue priority colors, red when a
-- property's status changes to Sold) — adds 'sold' as a valid
-- properties.status value alongside the existing active/inactive.
alter table properties drop constraint properties_status_check;
alter table properties add constraint properties_status_check
  check (status in ('active', 'inactive', 'sold'));
