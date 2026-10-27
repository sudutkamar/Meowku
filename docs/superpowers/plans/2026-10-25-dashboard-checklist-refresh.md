# Dashboard Checklist Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard's today's schedule card more compact, scannable, and action-oriented without changing the Supabase data contract.

**Architecture:** Keep occurrence ordering and completion mutations in `DashboardPage`; add derived display metadata locally for progress and pending-first ordering. Update the existing dashboard CSS only, preserving the current light/dark theme and responsive behavior.

**Tech Stack:** React, TypeScript, existing Supabase/TanStack Query hooks, CSS in `src/styles.css` and `src/brief-overrides.css`.

## Global Constraints

- Use Supabase as the only business-data source; do not add mock schedule data.
- Preserve Indonesian labels, the original logo, and existing `onNavigate('Jadwal')` behavior.
- Preserve completion mutation and error handling.
- Keep the card usable on mobile and in dark mode.
- Verify with `npm run typecheck`, `npm test`, and `npm run build`.

---

### Task 1: Refresh Checklist Structure

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx:1-63`
- Modify: `src/styles.css:11-13`
- Modify: `src/brief-overrides.css:1-80`

**Interfaces:**
- Consumes: existing `occurrences`, `completionRate`, `completeOccurrence`, `onNavigate`, and `timeLabel` values.
- Produces: a dashboard checklist with progress summary, pending-first rows, visible completed count, and unchanged completion behavior.

- [x] **Step 1: Add derived checklist display values**

Create local derived values immediately before the JSX return:

```tsx
const pendingOccurrences = occurrences.filter((item) => item.status !== 'completed');
const completedOccurrences = occurrences.filter((item) => item.status === 'completed');
const orderedOccurrences = [...pendingOccurrences, ...completedOccurrences];
const completedCount = completedOccurrences.length;
const totalCount = occurrences.length;
```

- [x] **Step 2: Replace the checklist header markup**

Render `completedCount dari totalCount selesai` beside the heading, plus a compact progress bar using `completionRate ?? 0`. Keep `Lihat semua` as the existing navigation button.

- [x] **Step 3: Replace each row with explicit priority classes**

Use `orderedOccurrences.map`. Add `dashboard-list-row pending` for incomplete items and `dashboard-list-row completed` for completed items. Keep the existing title, slot label, target label, time label, status text, `Tandai selesai` button, mutation disabled state, and error notice.

- [x] **Step 4: Add completed-count context when applicable**

Show a small `N tugas selesai` line below the list only when `completedCount > 0`, without introducing fake data or a second query.

- [x] **Step 5: Run typecheck and tests**

Run: `npm run typecheck` and `npm test`

Expected: PASS with no TypeScript errors and all existing tests passing.

- [x] **Step 6: Tune desktop and mobile styling**

Update existing dashboard selectors so the card uses `align-self: start`, rows use a three-column layout, pending rows receive an orange accent and primary action, completed rows are visually muted, and mobile rows stack the action full-width.

- [x] **Step 7: Tune dark-theme overrides**

Add dark-theme colors for the new progress track, pending accent, completed muted text, and primary completion button while maintaining WCAG-readable contrast against the existing dark card.

- [x] **Step 8: Run the full verification set**

Run: `npm run typecheck`, `npm test`, and `npm run build`

Expected: all commands PASS. The pre-existing Vite chunk warning may remain, but no new errors should be introduced.

- [x] **Step 9: Inspect the diff and report visual QA status**

Run: `git diff -- src/features/dashboard/DashboardPage.tsx src/styles.css src/brief-overrides.css docs/superpowers/plans/2026-10-25-dashboard-checklist-refresh.md`

Confirm no data literals, localStorage business state, or unrelated feature changes were added. Visual screenshot QA remains explicitly unverified unless a browser capture is run.
