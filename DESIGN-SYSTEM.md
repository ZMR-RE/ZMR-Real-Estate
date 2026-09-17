# ZMR Real Estate — Design System

Documents the design tokens and component patterns as they actually
exist in `src/index.css` today, post the warm-palette design pass
(commits `becdbfb`, `eee7f4f`, `6f07308`, `03475ff`). Reference this
before adding new CSS — almost every visual need already has a token or
a pattern here.

## Color tokens

Light mode is the source of truth; dark mode redefines every token
under `@media (prefers-color-scheme: dark)`, same names, so components
never branch on theme themselves.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#fbf9f6` | `#201b17` | Page background |
| `--surface` | `#ffffff` | `#2a241f` | Cards, inputs, tables, popovers |
| `--surface-sunken` | `#f4efe8` | `#251f1a` | Hover states, empty-state fill |
| `--text` | `#74695f` | `#b7ab9e` | Body text, secondary labels |
| `--text-h` | `#2c2620` | `#f6efe6` | Headings, high-emphasis text |
| `--border` | `#e7e0d6` | `#3c342c` | All borders/dividers |
| `--code-bg` | `#f3ede2` | `#2a241f` | `<code>` |
| `--accent` / `--accent-h` | `#b5583c` / `#9c4a31` | `#e0966f` / `#eaad8c` | Links, primary buttons, active nav, focus ring |
| `--danger` | `#b5442f` | `#e08571` | Errors, overdue Action Queue items |
| `--warning` | `#9a6420` | `#e0ac5f` | Due-soon Action Queue items |
| `--success` | `#3f7a45` | `#83c18a` | Success messages |
| `--neutral-bg` / `--neutral-border` | `rgba(116,105,95,.1 / .3)` | `rgba(183,171,158,.12 / .3)` | Neutral status badge |

Every semantic color (`accent`/`danger`/`warning`/`success`) also has a
`-bg` (≈10–14% opacity) and `-border` (≈35–40% opacity) variant for
tinted backgrounds — never hand-roll an `rgba()` for a new status color;
add the trio to `:root` instead.

**This is a warm, muted clay/neutral palette — no pink, no black-and-white
high contrast.** If a future task compares this against a bright
brand reference (e.g. crumblcookies.com's `#ffb9cd` primary pink /
`#ffe6e5` light pink / pure black-and-white buttons — see the audit
report for that extraction), know going in that today's palette is
deliberately warm-neutral and nothing like that; a comparison is a
starting conversation about direction, not a gap to close silently.

## Spacing, radius, type scale

```
--space-1: 4px   --space-4: 16px   --space-7: 48px
--space-2: 8px   --space-5: 24px   --space-8: 64px
--space-3: 12px  --space-6: 32px

--radius-sm: 8px   (inputs, buttons, small popovers)
--radius-md: 12px  (tables, collapsible sections, larger popovers)
--radius-lg: 18px  (.card)

--text-xs: 12px   --text-md: 14px   --text-lg: 18px   --text-2xl: 28px
--text-sm: 13px   --text-base: 16px --text-xl: 22px
```

Font: `system-ui, 'Segoe UI', Roboto, sans-serif` (`--sans`) — no custom
webfont. Base line-height 150%. Headings use `-0.01em` letter-spacing and
`font-weight: 600`; body text is unstyled default weight.

## Component patterns

Reach for these before writing new CSS — they cover the large majority
of screens in the app.

- **`.card`** — the base surface: white/dark card, `--radius-lg`,
  `--shadow-sm`. `.card-list` stacks cards with `--space-3` gaps for
  record lists (Property Registry).
- **`.empty-state`** — dashed border, sunken background, centered text.
  Every list component in the app uses this for its zero-state
  (`<p className="empty-state">No X yet.</p>`), not a plain `<p>`.
- **`.status-badge`** (+ `-neutral`/`-accent`/`-success`/`-warning`/`-danger`) —
  pill-shaped inline badge for record status (property status, etc.).
- **`.row-voided`** — 55% opacity for a soft-deleted/voided row that
  stays visible for audit purposes.
- **Forms** — plain `<form>` capped at `480px`, `<label>` always above
  its input, no inline-editable fields by default (CLAUDE.md's Data
  integrity rule: view-by-default, explicit Edit action). Checkbox rows
  use `label:has(input[type=checkbox])` to avoid full-width stretching.
- **Buttons** — bare `<button>` is a secondary/outline button;
  `button[type=submit]` is filled `--accent` (the only way to get a
  primary button — there's no `.button-primary` class). `[role=group]`
  wraps a row of mutually-exclusive toggle buttons (`aria-pressed=true`
  gets the filled-accent treatment) — used for Quick Capture's type
  selector and the mortgage scenario calculator's payment-mode toggle.
- **Tables** — always rendered as a rounded card (`border-radius: var(--radius-md)`
  on the `<table>` itself, not a wrapping div), horizontally scrollable,
  row hover highlights via `--surface-sunken`.
- **`.tab-bar`** — underline-style tabs (Property Profile). Mobile:
  horizontally scrollable rather than wrapping.
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

## Icons

None. No icon font or SVG icon set anywhere in the app — the only
decorative glyph is the CSS-drawn chevron on `.collapsible-section`. Any
future icon need currently has no established pattern to follow.

## Responsive rules (mobile, roadmap "Mobile responsiveness")

Two breakpoints, both in `index.css`'s `@media` blocks — no per-component
media queries exist elsewhere:

- **≤860px** — nav goes from a left sidebar to a horizontal top bar;
  main content padding shrinks to `--space-4`.
- **≤600px** — nav wraps to two rows (primary links / account controls);
  `.tab-bar` and `[role=group]` become horizontally scrollable instead of
  wrapping; all form inputs/buttons go full-width; inputs force
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

These are small and low-risk to leave as-is; call them out if a future
pass wants to formalize them, but they aren't causing any visible
inconsistency today.
