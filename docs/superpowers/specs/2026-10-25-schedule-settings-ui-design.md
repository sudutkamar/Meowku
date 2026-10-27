# Pengaturan Jadwal UI/UX Design

## Goal

Turn the schedule settings screen into a clear operational control center for household task assignment. Preserve the active dark theme while ensuring the light theme remains readable, balanced, and consistent with Meowku's warm orange visual language.

## Scope

- Redesign the existing schedule settings page and rotation panel.
- Keep the existing Supabase queries, mutations, RPCs, RLS, and admin authorization unchanged.
- Keep custom assignees that do not require login.
- Keep the existing weekly rotation and date range behavior.
- Add no mock data or decorative controls that do not have working behavior.

## Page Structure

1. Page header with title, concise description, and a small status summary.
2. Two-panel workspace on desktop:
   - `Petugas`: create and review available assignee names.
   - `Rotasi mingguan`: configure active dates and weekday assignments.
3. One-column stacked workspace on mobile.

## Petugas Panel

- Show the add-name input and action as a compact form.
- Render existing names as compact cards/chips with initials and readable names.
- Show a useful empty state when no names exist.
- Do not show delete or edit actions unless the existing data layer supports them.
- Keep pending, error, and success feedback visible near the form.

## Weekly Rotation Panel

- Put start and end dates together in a consistent date toolbar.
- Render seven weekday assignment cards in a responsive grid:
  - four columns then three columns on wide screens;
  - two columns on tablet;
  - one column on small screens.
- Each card has a stable label and full-width select control.
- Distinguish assigned and unassigned days through surface/border state, not color alone.
- Show a footer summary such as `5 dari 7 hari sudah diatur`.
- Show a warning when days remain unassigned.
- Keep one primary `Simpan rotasi` action in the panel footer.

## Theme Requirements

- Dark mode remains the screenshot's visual baseline: dark brown surfaces, warm borders, cream text, and orange actions.
- Light mode receives explicit surface, border, text, muted text, input, placeholder, focus, disabled, notice, and success tokens.
- Focus rings must remain visible in both themes.
- Avoid hardcoded colors that are legible only in dark mode.
- Preserve rounded cards and the existing Meowku typography hierarchy.

## Responsive Requirements

- No horizontal overflow at mobile widths.
- Inputs and selects must have usable tap targets.
- The primary save action becomes full-width on narrow screens.
- Text must not depend on a single-line layout.

## Data and Access Behavior

- The page continues to resolve household access through `household_access`.
- Non-owner/admin users see an explanatory access state and no editable rotation controls.
- All writes continue through the existing save assignee and save rotation hooks.
- No database migration is required.

## Verification

- Add or update static regression tests for the page structure and theme classes.
- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Perform visual QA in dark and light themes at desktop and mobile widths when a browser is available.
