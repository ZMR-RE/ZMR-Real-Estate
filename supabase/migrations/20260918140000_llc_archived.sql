-- Roadmap 8.2a/8.2b — Organization type (formerly "LLC") records need an
-- edit/archive path; archive rather than hard-delete since a property
-- may still reference an archived one historically.
alter table llcs add column archived boolean not null default false;
