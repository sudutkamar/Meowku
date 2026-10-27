# Schedule Slot Drag Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag schedule slots into a preferred order and persist that order safely.

**Architecture:** Keep reorder state inside `SchedulesPage`, use native HTML drag events without a dependency, and normalize `sort_order` before create/update mutations. Add keyboard move buttons as an accessible fallback.

**Tech Stack:** React, TypeScript, native drag-and-drop events, Supabase RPC payloads, Node test contracts.

## Global Constraints

- No new dependency for drag-and-drop.
- Existing slot archive semantics remain unchanged.
- Existing occurrence identity and history must not change.
- Only active slots are draggable and rendered in the editor.
- Reordering must persist through the existing `slots` payload.

### Task 1: Add Reorder Contract Tests

**Files:**
- Modify: `tests/domain/schedule-overhaul.test.mjs`

- [ ] **Step 1: Add failing assertions**

Assert the schedule page contains drag handlers, a drag handle, keyboard move controls, and `sort_order` normalization.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- tests/domain/schedule-overhaul.test.mjs`

Expected: FAIL because the editor does not expose reorder behavior yet.

### Task 2: Implement Slot Reordering

**Files:**
- Modify: `src/features/schedules/SchedulesPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `reorderSlots(slots: ScheduleSlot[], fromIndex: number, toIndex: number): ScheduleSlot[]`
- `moveSlot(index: number, direction: -1 | 1): void`

- [ ] **Step 1: Add native drag state and reorder helper**

Track the active dragged slot by its stable slot id or editor index. Reorder only active slots, then merge inactive persisted slots back without changing their archive state.

- [ ] **Step 2: Add drag handle and keyboard controls**

Render a handle with `draggable`, `onDragStart`, `onDragOver`, and `onDrop`. Add `Naik` and `Turun` buttons with disabled boundaries and labels.

- [ ] **Step 3: Normalize order before save**

Rewrite active slot `sort_order` from zero in visible order before passing the form to create/update mutations.

- [ ] **Step 4: Add visual feedback**

Style the handle, dragging row, drop target, and compact mobile layout using the existing warm cream/orange and dark theme tokens.

- [ ] **Step 5: Run focused verification**

Run: `npm test -- tests/domain/schedule-overhaul.test.mjs`

Expected: PASS.

### Task 3: Full Verification

**Files:**
- No additional source files.

- [ ] **Step 1: Run all tests**

Run: `npm test`

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Run production build**

Run: `npm run build`

- [ ] **Step 4: Confirm no remote migration is required**

The feature uses the existing `sort_order` column and existing create/update RPC contracts, so no database migration or remote deployment is needed.
