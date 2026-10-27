# Cat Detail Compact Care Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the cat detail page a compact, readable care workspace matching the approved direction.

**Architecture:** Keep the existing `CatsPage` route and `CatCarePanel` data flow. Change only the detail-page header markup and page-specific CSS, with explicit responsive and dark-mode rules.

**Tech Stack:** React, TypeScript, TanStack Router, CSS, Node test runner.

## Global Constraints

- No mock or hardcoded business data.
- No route or database contract changes.
- Preserve Indonesian labels and the existing orange/cream visual language.
- Verify with the existing test suite, typecheck, and production build.

---

### Task 1: Add Header Regression Coverage

**Files:**
- Modify: `tests/ui/cat-care.test.mjs`

- [ ] Add assertions that the cat detail markup contains the compact identity header class, metadata class, and profile action label.
- [ ] Run the focused test and confirm it fails against the current markup.

### Task 2: Implement Compact Detail Header

**Files:**
- Modify: `src/features/cats/CatsPage.tsx`
- Modify: `src/cat-care.css`
- Modify: `src/cat-care-tabs.css`

- [ ] Replace the loose detail heading with a `cat-detail-hero` containing back navigation, icon, eyebrow, cat name, metadata chips, and a clear `Edit profil` action.
- [ ] Keep `CatCarePanel` immediately after the hero and preserve all existing route/search behavior.
- [ ] Style the hero, metadata chips, action, connected tab surface, panel spacing, responsive wrapping, and explicit dark mode colors.
- [ ] Run the focused regression test and confirm it passes.

### Task 3: Verify Production Behavior

**Files:**
- Modify: `docs/QA_REPORT.md`

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Record the visual QA limitation if no browser session is available.
