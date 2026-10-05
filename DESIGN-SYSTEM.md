# ZMR Real Estate — Design System

Documents the design tokens and component patterns as they actually
exist in `src/index.css` today, post the navy/white visual-direction
pass (approved mockup direction, replacing the earlier warm clay/neutral
palette). Reference this before adding new CSS — almost every visual
need already has a token or a pattern here.

## Color tokens

Light mode is the source of truth for page content; dark mode redefines
every content token under `@media (prefers-color-scheme: dark)`, same
names, so components never branch on theme themselves. The sidebar is
the one exception — see "Structural navy (sidebar)" below.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#f7f9fb` | `#0f1720` | Page background |
| `--surface` | `#ffffff` | `#182430` | Cards, inputs, tables, popovers |
| `--surface-sunken` | `#eef1f5` | `#1c2934` | Hover states, empty-state fill |
| `--text` | `#5b6472` | `#93a1b1` | Body text, secondary labels |
| `--text-h` | `#13293d` | `#f0f4f8` | Headings, high-emphasis text |
| `--border` | `#dde3ea` | `#2b3846` | All borders/dividers |
| `--code-bg` | `#eef1f5` | `#1c2934` | `<code>` |
| `--accent` / `--accent-h` | `#123456` / `#0e2a45` | `#6fa8dc` / `#8fbde6` | Links, primary buttons, active nav underline, focus ring |
| `--danger` | `#b5442f` | `#e08571` | Errors, overdue Action Queue items |
| `--warning` | `#9a6420` | `#e0ac5f` | Due-soon Action Queue items |
| `--success` | `#3f7a45` | `#83c18a` | Success messages, positive financial states — **the only place green appears** |
| `--neutral-bg` / `--neutral-border` | `rgba(91,100,114,.1 / .3)` | `rgba(147,161,177,.12 / .3)` | Neutral status badge |

Every semantic color (`accent`/`danger`/`warning`/`success`) also has a
`-bg` (≈8–14% opacity) and `-border` (≈35–40% opacity) variant for
tinted backgrounds — never hand-roll an `rgba()` for a new status color;
add the trio to `:root` instead.

**Navy is the structural/primary color; white/near-white is the base
ground.** Green is reserved exclusively for success/positive-financial
states — it's never reused as a generic accent or a neutral tint, so a
green anywhere in the UI always means "success."

### Structural navy (sidebar)

The sidebar is fixed brand chrome, not themed page content — it stays
navy in both light and dark mode, via its own token set that is **not**
overridden in the dark media query:

| Token | Value | Used for |
|---|---|---|
| `--nav-bg` | `#123456` | Sidebar background (same navy as `--accent` in light mode) |
| `--nav-text` | `rgba(255,255,255,.78)` | Inactive nav link text |
| `--nav-text-h` | `#ffffff` | Brand, active nav link text |
| `--nav-bg-hover` | `rgba(255,255,255,.08)` | Nav link hover |
| `--nav-bg-active` | `rgba(255,255,255,.14)` | Current-route nav link |
| `--nav-border` | `rgba(255,255,255,.12)` | Sidebar's own dividers |

### Contextual card tints

Property Registry cards (and any future `.card-list`) get one of 4 soft
tints, assigned deterministically per record by `shared/cardTint.ts`
(`cardTintClass(id)` hashes the id to `card-tint-1`..`card-tint-4`) — the
same record always renders the same tint, but which of the 4 it lands on
carries no meaning of its own.

| Token | Light | Dark |
|---|---|---|
| `--tint-1` | `#eef4fb` (pale blue) | `#17222f` |
| `--tint-2` | `#f5f1fa` (pale lavender) | `#1e1c27` |
| `--tint-3` | `#fbf3ec` (pale sand) | `#241c17` |
| `--tint-4` | `#eef1f4` (pale neutral gray) | `#1a2228` |

None of the 4 use a green hue — that's deliberately reserved for
`--success` so a tinted card is never mistaken for a status signal.
`.status-badge` always renders solid-filled (not tinted) specifically so
status meaning stays legible against whatever tint the card underneath
has.

## Spacing, radius, type scale

```
--space-1: 4px   --space-4: 16px   --space-7: 48px
--space-2: 8px   --space-5: 24px   --space-8: 64px
--space-3: 12px  --space-6: 32px

--radius-sm: 8px    (inputs, secondary buttons, small popovers)
--radius-md: 12px   (tables, collapsible sections, larger popovers)
--radius-lg: 18px   (.card)
--radius-pill: 999px (primary buttons, status badges — see Buttons below)

--text-xs: 12px   --text-md: 14px   --text-lg: 18px   --text-2xl: 28px
--text-sm: 13px   --text-base: 16px --text-xl: 22px
```

Font: `system-ui, 'Segoe UI', Roboto, sans-serif` (`--sans`) — no custom
webfont. Base line-height 150%. Headings use `-0.01em` letter-spacing;
body text is unstyled default weight.

## Headings

`h1`–`h4` share `font-weight: 700` (up from a prior 600) for more visual
confidence per the approved mockup; `h1` goes further to `font-weight:
800`. Color is `--text-h` (a dark navy in light mode) throughout.

## Component patterns

Reach for these before writing new CSS — they cover the large majority
of screens in the app.

- **`.card`** — the base surface: white/dark card, `--radius-lg`,
  `--shadow-sm`. `.card-list` stacks cards with `--space-3` gaps for
  record lists (Property Registry); a card can additionally carry one of
  `.card-tint-1`..`.card-tint-4` (see Contextual card tints above).
- **`.empty-state`** — dashed border, sunken background, centered text.
  Every list component in the app uses this for its zero-state
  (`<p className="empty-state">No X yet.</p>`), not a plain `<p>`.
- **`.status-badge`** (+ `-neutral`/`-accent`/`-success`/`-warning`/`-danger`) —
  pill-shaped (`--radius-pill`) inline badge for record status, always
  solid-filled — never tinted to match a card underneath it.
- **`.row-voided`** — 55% opacity for a soft-deleted/voided row that
  stays visible for audit purposes.
- **Forms** — plain `<form>` capped at `480px`, `<label>` always above
  its input, no inline-editable fields by default (CLAUDE.md's Data
  integrity rule: view-by-default, explicit Edit action). Checkbox and
  radio rows (a `<label>` wrapping its input) use
  `label:has(input[type=checkbox])` / `label:has(input[type=radio])`:
  the control sits inline before its text at natural width, never
  stretched or centred on its own line.
- **`.field-group-row`** (INS-1) — lays whole `.property-field-group`
  sections side by side: 3 across on wide screens, 2 then 1 at the same
  breakpoints `.field-grid` uses. Different question from `.field-grid`
  itself (which arranges individual fields, sized for single-column
  form-usability research) — this arranges whole multi-field
  subsections next to each other, used by both a box's expanded
  read-only view and its matching Edit form so the two share one reflow
  rule (Insurance's Policy identification/Coverage & cost/Contacts &
  extras is the first user). Reach for it whenever a box groups related
  content into named subsections that should sit side by side rather
  than stack.
- **`.field-group-row--two-col`** (Batch S3) — same class, capped at 2
  columns on desktop instead of 3, still 1 at the same 640px breakpoint.
  Currently used only by the devHarness-only grouped-Property-form
  preview (not shipped in the real app) — add this modifier again if a
  future real box needs a two-, not three-, column grouping.
- **`.preview-steps`/`.preview-step`/`.preview-step--active`/`.preview-step--done`**
  (Batch S, devHarness-only) — a plain four-step indicator for the
  property-creation flow preview. Reuses existing tokens only, no new
  color. Not a shipped component — kept for the devHarness-only preview
  components, which remain a separate, still-unshipped surface.
- **`.wizard-steps`/`.wizard-step`/`.wizard-step--active`/`.wizard-step--done`**
  (Package 1, shipped) — the real step indicator for the property-
  creation four-step wizard, once its layout cleared visual approval.
  Identical rules/tokens to `.preview-step` above, kept as its own class
  rather than reused since the two now have separate lifecycles.
- **`.insurance-policy-form`** (owner-approved Insurance width fix) —
  the one named, deliberate exception to the plain-`form` 480px cap
  above: `max-width: 960px`, so its own 3-column `.field-group-row`
  isn't squeezed into three ~140px columns. Still a max-width, not a
  fixed width — collapses the same as any other form at narrower
  viewports. Scoped to this one class only; every other form in the app
  keeps the 480px default.
- **`.field-hint`** (INS-1) — a small muted clarifying line under a
  field, for a case where the label alone could read as asserting more
  than what's actually recorded (e.g. a premium with no stored
  annual/installment basis yet). Not a validation error and not a
  required marker — purely informational.
- **`.table-row-note`** (H2, mortgage history) — a sentence-length note
  about one table row (history status, void outcome), rendered on its own
  line under the cell value. Wraps within 34ch even though table cells are
  `white-space: nowrap`, so a long note never widens a table past its box.
  Pair with a one-word `.status-badge` when the row also needs a status
  label; keep badge text short so it never clips at phone width.
- **`.field-error`** (M3, manual bookkeeping) — inline validation message
  directly under an invalid field (danger color, `--text-sm`), paired with
  `aria-invalid`/`aria-describedby` on the input, which also gets a
  danger border. A form shows one `[role=alert]` summary at the top
  ("Not saved yet. Fix: …") plus one `.field-error` per field — never an
  unexplained disabled Save.
- **`PickListSelect` `emptySetup`** (M1) — opt-in first-use prompt for a
  *required* pick list with no active choices: a `.field-hint`
  explanation and an "Add …" button (`.pick-list-setup`) that opens the
  same Manage panel; the value added there is selected. Screens that
  don't pass `emptySetup` are unchanged.
- **`.transaction-form-actions` / `.transaction-form-secondary-submit`**
  (M2) — wrapping action row for a form with two submit paths (Save,
  Save and add another). The second submit keeps the outlined secondary
  look so each form still has exactly one primary (filled) action.
- **`.transaction-list`** (M3) — the Financials transaction table.
  `.transaction-list-wrap` lets text columns wrap and
  `.transaction-list-action-group` wraps row actions inside their cell,
  so nothing overflows the table card at desktop widths. When the list's
  own container is ≤760px wide (a container query, so it accounts for the
  sidebar) each row becomes a stacked card: `thead` is hidden and every
  cell shows its own `data-label` caption, so Amount and all actions are
  visible without sideways scrolling. Deliberate, scoped exception to
  the sticky-header rule in the stacked layout only (a card list has no
  header row to freeze); every other table keeps `.table-scroll` behavior.
- **`.financials-summary-table`** (M5) — the Financials summary tables
  (up to six money columns) let cells wrap instead of the global
  `nowrap`, so they fit the content column at intermediate widths.
- **Buttons** — bare `<button>` is a secondary/outline button, still
  `--radius-sm` and regular weight. `button[type=submit]` is the primary
  action: filled `--accent`, `font-weight: 700`, and fully-rounded
  (`--radius-pill`) — there's no `.button-primary` class, submit is the
  only way to get one. `[role=group] button[aria-pressed=true]` (Quick
  Capture's type selector, the mortgage scenario calculator's
  payment-mode toggle) gets the same filled-pill-bold treatment since
  it's functionally a selected primary action, not just a submit.
- **Tables** — always rendered as a rounded card (`border-radius: var(--radius-md)`
  on the `<table>` itself, not a wrapping div), horizontally scrollable,
  row hover highlights via `--surface-sunken`.
- **`.tab-bar`** — underline-style tabs (Property Profile), underline in
  `--accent`. Mobile: horizontally scrollable rather than wrapping.
- **`.property-sticky-header`** / **`.property-sticky-title`** — Property
  Profile's address heading and tab bar in one sticky block, so the address
  stays visible while scrolling. Compact heading (`--text-xl`), wraps long
  addresses (never truncates). Its live height (`useStickyHeaderHeight`)
  sets `--sticky-tab-bar-height` on `.property-profile`, so sticky table
  headers on every property tab sit just below it.
- **`.collapsible-section`** — `<details>`/`<summary>`-based, used for
  every grouped block on the Property Profile and KPI tabs (Units,
  Specs, Utilities, Security Deposits, Tenants, KPI cards). Rotating
  chevron via a `::before` pseudo-element, not an SVG/icon font.
- **`SearchableSelect`** (`.searchable-select*`) — the one type-ahead
  picker component, used for every "pick a property/vendor/LLC/tenant"
  field app-wide. Don't build a second one.
- **Pick lists** (`.pick-list-select`, `.manage-options*`) — the
  account-scoped add/archive dropdown system (roadmap 8.1). A
  `PickListSelect` renders the dropdown; `ManageOptionsPanel` is the
  reusable add/archive popover, used standalone on `/settings` and
  embedded next to individual pick-list fields elsewhere.
- **`.page-header-row`** — flex row with `justify-content: space-between`,
  the standard "heading + one action control" layout (e.g. a page title
  next to its Manage Options panel).
- **`.property-details-title`** — the second-tier heading for a plain
  data sub-list nested inside an already-titled box (e.g. Property
  Information's "Details"/"Ownership" sub-headings, a KPI card's
  per-group heading, a "Documents"/"Links & attachments" sub-section).
  Small, no icon, no accent color — deliberately quieter than
  `.property-field-group-title` (bold, accent-colored, icon-bearing —
  for a subsection that's a real peer of the box's other top-level
  groups). Always this class on any such heading, never a bare `<h4>`.

### PDF preview (shared, R2)

`src/shared/pdf/PdfCanvasPreview.tsx` with `src/shared/pdf/pdfPreview.css` shows a PDF by drawing its **actual bytes** with pdf.js (`pdfjs-dist`, loaded only when a preview is shown). It never uses an embedded browser PDF viewer, which can stay as a blank dark panel inside a page without reporting an error.

- **`.pdf-preview`** — sunken, bordered scroll box (max 720px tall; 520px at ≤600px).
- **`.pdf-preview-page`** — one drawn page: white, full width, `--shadow-sm`.
- **`.pdf-preview-status`** — "Drawing the PDF…" while loading.
- **`.pdf-preview-error`** — uses the global `[role='alert']` danger styling. It names the failure and offers **Open in new tab**, **Download PDF** and **Try again** (`.pdf-preview-actions`, 44px tall at ≤600px).
- A page that draws nothing counts as a failure, not a preview.
- Callers pass the bytes, an accessible label, an object URL of the same bytes (for the fallbacks) and a filename.
- First used by Settings › Entities › Branding & documents.

### Tenancy entry choices (leases module)

`src/modules/leases/leases.css` — used where adding a tenancy needs an explicit choice first (resume an unfinished tenancy; add a co-tenant vs a separate tenancy).

- **`.lease-choice`** — sunken, bordered panel (`--surface-sunken`, `--border`, `--radius-sm`) holding the explanation and the options.
- **`.lease-choice-option`** — one option: its description, then its button; wraps on phones.

**Box header "Add" button (`EditableSection` `addLabel`)** — owner-approved for Property Overview › Tenants only ("+ Add tenant"). It sits beside Edit, uses the same button style, opens the box and enters the same edit state. Not a default for other boxes.

### Agents workspace preview (T4, preview-only, not shipped)

`src/modules/automations/preview/agentsPreviewTokens.css`,
`agentsProfilePreview.css`, `agentsWorkspacePreview.css` and
`agentsPreviewPhone.css`, loaded only by
`agents-preview.html`.

- **Preview-scoped tokens** `--agents-review-bg/-border` (clearer light
  yellow, `#fff7d1` / `#e6c85a` light; translucent yellow in dark) and
  `--agents-problem-bg/-border` (soft red) — defined on `.agents-workspace`
  with light and dark values, because the shared `--warning-bg` reads brown.
  Proposed for promotion to `index.css :root` if the owner approves the look;
  until then no shipped screen changes.
- **`.agents-row--review` / `.agents-row--problem`** — owner colour decision
  (September 30, 2026): whole row light yellow when human review is needed,
  soft red for failures, disconnection or overdue work, neutral otherwise
  (idle or ordinary drafting is never an alert). Tint layered over
  `--surface`; hover keeps it. Also used on review cards in Approvals.
- **`.agents-row--selected`** — 2px `--accent` outline plus inset bar,
  never a background swap, so a selected yellow/red row keeps its colour.
  Alert rows also carry a text badge so state never depends on colour alone.
- **`.agents-compact-button`** — 36px secondary button; 44px at ≤600px.
- **Phone touch targets** (`agentsPreviewPhone.css`, ≤600px) — every
  control in the preview is ≥44px, including the shared box Edit button,
  `.tab-bar` tabs and box headers, via overrides scoped to
  `.agents-workspace`. The same shortfall exists app-wide in shared styles
  (Edit 34px, tabs 42px); fixing it globally is a separate shared-style
  change, not made here.
- **`.agents-notice-flag` / `.agents-notice-confirm`** — text-first flags
  inside a card (edit-during-run conflict, approval cleared, possible
  duplicate; confirm steps), left border only.
- Directory pager (`.agents-pager`, 25/50/100) and `.agents-selected-note`
  ("Show selected" when the selected row is off-page or filtered out).
- Two panes at ≥1201px (approved direction); below 1200px one pane at a time
  as a narrow-width fallback, with an "All agents" back control.

## Icons

No icon font or SVG icon library anywhere in the app — the CSS-drawn
chevron on `.collapsible-section` is one exception; the other is a set
of small hand-rolled inline SVGs next to Property Profile section
titles and stat cards (`propertyFieldGroupIcons.tsx`, roadmap 7.35/
7.38/7.45/7.47/7.50). Any future icon follows this established
convention rather than introducing a new one:

- `viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"`
  — `currentColor` means each icon automatically follows its container's
  own text color (e.g. `.property-field-group-title`'s accent color)
  rather than needing a separate color rule.
- Two size tiers, both calibrated to render the same visual line
  weight despite the size difference: next to `.property-field-group-title`
  (16×16px rendered), `strokeWidth="1.5"`; next to `.property-stat-card`
  (20×20px rendered, a more prominent context beside a large bold
  number), `strokeWidth="1.25"` — the smaller width at the larger
  render size keeps the actual on-screen stroke thickness equal
  (1.5×16/24 ≈ 1.25×20/24) rather than looking heavier.
- Any rectangle within an icon uses `rx="1"` for corner rounding — the
  one shared rounding value across every rect-based icon in the set
  (`ExteriorInformationIcon`, `UnitsIcon`, `LivingAreaIcon`,
  `YearBuiltIcon`); don't introduce a different radius.
- No `strokeLinecap`/`strokeLinejoin` overrides — every icon uses the
  SVG default (butt cap, miter join) uniformly, for sharp, consistent
  line ends and corners across the whole set.

## Responsive rules (mobile, roadmap "Mobile responsiveness")

Two breakpoints, both in `index.css`'s `@media` blocks — no per-component
media queries exist elsewhere:

- **≤860px** — nav goes from a left sidebar to a horizontal top bar
  (still navy — the structural tokens don't change at this breakpoint,
  only the layout direction); main content padding shrinks to `--space-4`.
- **≤600px** — nav wraps to two rows (primary links / account controls);
  `.tab-bar` and `[role=group]` become horizontally scrollable instead of
  wrapping; all form inputs/buttons go full-width (a full-width primary
  button keeps its pill ends, just stretched); inputs force
  `font-size: var(--text-base)` (16px) specifically to prevent iOS
  Safari's auto-zoom-on-focus.

## What's explicitly *not* systematized yet

- No elevation/z-index scale — popovers hardcode `z-index: 20` or `30`
  ad hoc (`.searchable-select-menu`, `.manage-options-panel`,
  `.account-security-panel`).
- No motion/transition scale — durations are hardcoded per-rule
  (`0.12s`, `0.15s`), always `ease`.
- No breakpoint variables — `860px`/`600px` are magic numbers repeated
  wherever needed.
- Card tinting is wired up for `.card-list` only (Property Registry) —
  no other module currently renders records as a `.card-list`; extend
  the same `cardTintClass()` helper if one is added later rather than
  hand-rolling a second tint scheme.

These are small and low-risk to leave as-is; call them out if a future
pass wants to formalize them, but they aren't causing any visible
inconsistency today.
