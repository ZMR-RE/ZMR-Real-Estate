# ZMR Real Estate — Build Rules

This file is auto-loaded by Claude Code at the start of every session in this project. Read it before taking any action. These rules are enforced, not suggestive — do not deviate without stopping to flag it first.

## Scope discipline
- Only build items listed on `zmr-real-estate-roadmap.md`. Do not build, add, or expand scope beyond what's approved there without stopping and getting explicit sign-off first.
- Once an item's prerequisites are met and it's within approved scope, execute it without pausing for a go-ahead on each sub-step. Don't idle on approved, unblocked work waiting for permission.

## Code organization
- Each dashboard module gets its own folder under `/modules`, split by concern inside it: UI components, data-query files (all Supabase calls for that module), and business logic stay in separate files within the folder. Never combine multiple modules into one file, and never let UI, queries, and logic pile into a single file within a module.
- Shared code (reused buttons/inputs, the Supabase client, auth helpers) lives in `/shared`, not duplicated per module.
- This is how a non-coder owner can isolate and find broken code without reading the whole codebase, and how the codebase stays navigable once it's sold and other developers touch it.
- Standard module shape, established by `src/modules/properties/` — follow it for new modules rather than rediscovering a structure:
  - `<module>Queries.ts` — every Supabase call for the module, nothing else.
  - `use<Module>.ts` — business logic hook (state, selection, save/cancel); calls the queries file, never Supabase directly.
  - `<Entity>List.tsx` / `<Entity>Form.tsx` — presentational UI, no Supabase imports.
  - `<Module>.tsx` — top-level screen component wiring the hook to the UI components.

## Fix philosophy
- Root-cause fixes only. No bandage fixes, no patches that mask the underlying bug.
- If the root-cause fix is bigger than expected, stop and flag it rather than patching around it to move faster.

## Data safety
- Every table and query touching user/tenant data must enforce `account_id` row-level security scoping. No exceptions.
- No destructive actions without a safeguard: commit to git before any risky change. No dropping tables, force-pushing, or hard-deleting data without an explicit, approved step. Prefer soft-delete/archive over hard delete.
- Any credential — password, token, or key — must be entered through direct/masked terminal input (e.g. the ! method), never typed or pasted into the Claude Code chat interface itself.
- Every external service this project connects to (GitHub, Supabase, Netlify, etc.) must use a project-scoped credential stored locally to this project — never a shared or global login. This lets ZMR and other dashboard projects run at the same time without one knocking the other's session loose.

## Parallel terminal safety
- Each terminal owns a distinct file/section (per the code organization rule above). Do not touch a file another terminal is currently assigned to.

## Definition of done
- A section is not marked complete on the roadmap until it runs error-free and follows every rule above.

## Session close-out
- Before ending a session, write a short plain-language summary of what changed and why — for a non-coder to review without reading the code directly.
