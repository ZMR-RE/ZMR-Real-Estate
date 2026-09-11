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

## Test verification cleanup
- When cleaning up after live verification, only delete records your own session created. Never delete a pre-existing record you only edited during testing — revert the specific field(s) you changed instead. If you cannot distinguish whether a record predates your test, stop and ask before deleting it.

## Data integrity
- Never seed, infer, or guess a field's value from a naming pattern or assumption (e.g. deriving an LLC name from a property's address). Leave the field blank and prompt the user for the real value instead. Only user-entered data is treated as truth.
- Entity detail screens (Property, Mortgage, LLC, and future entities) default to a read-only view. Editing requires an explicit "Edit" action — never inline-editable by default.
- All data entry, edits, and feature verification must go through the live dashboard UI as the end user would use it. Backend/database scripts may be used to inspect data for debugging, but never as a substitute for entering or editing real records — the dashboard is the only sanctioned path for data in or out.

## Identifiers
- Property records are identified by address, not a free-text name field. Units display as {property address} — {unit label}. LLC, Vendor, and Tenant retain their own name as their identifier.

## Bookkeeping
- The Chart of Accounts is always user-visible and user-editable — every transaction category's mapping to an accounting bucket (Asset/Liability/Income/Expense) must be inspectable and adjustable by the account owner, never hidden system logic. It ships preloaded with a standard rental real-estate chart of accounts; the user may edit or extend it from there.
- Split Rules (e.g. a saved 50/50 reimbursement with a vendor) are never auto-applied under any condition. The system must require an explicit user action every time a Split Rule is used — no setting may change this behavior.
- Security deposits held on a tenant's behalf must post to a Liability account, never to Income, at time of receipt. Applying a deposit to damages or returning it must be an explicit transaction that clears the liability — never a silent balance adjustment.
- A financial period that has been closed/locked (see roadmap 9.15) may not be edited without an explicit "reopen" action, which must be captured in the transaction audit trail (7.8/9.14).

## Multi-tenant discipline
- Before marking any feature complete, verify it works correctly for a brand-new account with zero properties and zero data — not just for the existing ZMR account. No feature may assume ZMR's specific properties, LLCs, or data exist.
- Every account must have a functioning data export path for its own data at all times (standard SaaS trust requirement — a customer can leave with their data on request, no lock-in).

## Notifications
- All system notifications and reminders must route through the Action Queue. No standalone notification surface may be built outside it.

## Parallel terminal safety
- Each terminal owns a distinct file/section (per the code organization rule above). Do not touch a file another terminal is currently assigned to.
- Before considering any wiring/integration commit complete, verify every file it imports or references is actually tracked in git (`git ls-files`), not just present on disk — a file left untracked by another terminal will build locally but fail on Netlify's fresh clone.
- When stopping a local dev server, kill only the specific port your own terminal started (e.g. `lsof -ti:5173 | xargs kill`), never a broad process-name kill (`pkill -f vite`, `pkill node`, etc.) that could terminate another terminal's running server.

## Design principle
- Everything on screen must have a clear purpose — no noise, no redundancy. Prefer depth on one entity (e.g. a full property profile) over breadth across many shallow, disconnected screens.

## Definition of done
- A section is not marked complete on the roadmap until it runs error-free and follows every rule above.
- Any commit that integrates multiple terminals' work must be verified with a clean clone build (git clone to a fresh directory, npm install, npm run build) before pushing — not just a local build in the shared working directory, which can pass even when the real deploy would fail.
- Checking off a roadmap item's checkbox is not optional and not a separate documentation task. It is a required, non-negotiable step of completing that item's work, and must happen in the same commit that completes it. An item's checkbox must never be left unchecked once its work meets the Definition of Done criteria above, and must never be checked before those criteria are met. A terminal must verify checkbox accuracy for every roadmap item it touches before ending its work on that item.

## Session close-out
- Before ending a session, write a short plain-language summary of what changed and why — for a non-coder to review without reading the code directly.
