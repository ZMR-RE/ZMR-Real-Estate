-- Roadmap 7.42 (1) — Simplify the Exterior wall material pick list to
-- exactly: Brick, Frame, Vinyl siding, Stucco, Stone, Concrete block,
-- Other. Masonry (added 20260922120000) is dropped as a standalone
-- option — Brick/Stone/Concrete block already cover masonry
-- construction individually, so a separate generic "Masonry" option
-- was redundant. Same soft-archive precedent as that migration: no
-- property has ever had "Masonry" selected (checked live before this
-- change), so archiving it is safe and loses nothing.
update pick_list_options
set active = false
where list_name = 'exterior_wall_material'
  and value = 'Masonry';

-- Stone was archived by 20260922120000 (not in that item's 6-value
-- list) but belongs in this item's final 7. Reactivate it for accounts
-- that already have the row; insert it for any account that doesn't
-- (e.g. one created after the original 20260922110000 seed but before
-- Stone existed at all — shouldn't happen given seeding runs per
-- migration, but on conflict do update covers it defensively either
-- way).
insert into pick_list_options (account_id, list_name, value)
select a.id, 'exterior_wall_material', 'Stone'
from accounts a
on conflict (account_id, list_name, value) do update set active = true;

-- Concrete block is genuinely new to this list.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'exterior_wall_material', 'Concrete block'
from accounts a
on conflict (account_id, list_name, value) do nothing;
