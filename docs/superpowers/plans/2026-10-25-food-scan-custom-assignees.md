# Food Scan And Custom Assignees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unnecessary expense tab, implement reviewed barcode/OCR food scanning, and support schedule assignees who do not need login accounts.

**Architecture:** Keep existing food/expense tables and scan records, extending the scan flow with authenticated Edge Function lookup and a review form. Add household-scoped assignee records and snapshot assignee IDs onto occurrences while retaining logged-in completion authorization.

**Tech Stack:** React, TypeScript, TanStack Query, Supabase PostgreSQL/RLS/RPC, Supabase Edge Functions, browser BarcodeDetector API.

## Global Constraints

- No scan result is automatically trusted or written as a confirmed food product.
- Existing occurrence history remains immutable.
- RLS restricts assignees and rotations to household members; only owner/admin can manage them.
- Existing food, expense, report, and audit data remain queryable.
- Preserve Indonesian labels and use Supabase as the business data source.

---

### Task 1: Reduce Cat Care Tabs

**Files:**
- Modify: `src/features/cats/CatCarePanel.tsx`
- Modify: `tests/ui/cat-care-tabs.test.mjs`

- [ ] Add a failing assertion that the tab list contains exactly Ringkasan, Kesehatan & vaksin, and Makanan and does not render Pengeluaran.
- [ ] Run the focused test and verify the expected failure.
- [ ] Remove the expense tab and its detail rendering while leaving expense hooks and database data available to reports.
- [ ] Run the focused test and verify it passes.

### Task 2: Add Reviewed Food Scan Flow

**Files:**
- Create: `supabase/functions/scan-food/index.ts`
- Modify: `supabase/migrations/20261025000400_cat_health_food_expenses.sql`
- Modify: `src/features/cats/useCatCare.ts`
- Modify: `src/features/cats/CatFoodExpensePanel.tsx`
- Modify: `src/cat-care.css`
- Modify: `tests/ui/cat-food-scan.test.mjs`
- Modify: `tests/security/cat-scan.test.mjs`

- [ ] Add failing tests for barcode/OCR actions, editable draft fields, confirmation before product creation, and Edge Function JWT/household validation.
- [ ] Run focused tests and verify they fail for missing scan UI/function behavior.
- [ ] Add the authenticated Edge Function contract accepting `{ scanType, barcode?, imageBase64? }`, normalizing `{ brand, product_name, variant, food_type, barcode, source }`, and returning draft/error data without inserting a product.
- [ ] Add hooks for invoking the function, creating draft scan records, and confirming a scan into `food_products` with explicit DTO fields.
- [ ] Add camera barcode scanning with `BarcodeDetector` feature detection and image-label fallback input; show loading, unsupported, permission, lookup, and manual-edit states.
- [ ] Add `Scan barcode` and `Foto label` UI in the food panel; only `Konfirmasi dan simpan` creates the food product.
- [ ] Run focused tests and verify they pass.

### Task 3: Add Custom Household Assignees

**Files:**
- Create: `supabase/migrations/20261025000500_custom_schedule_assignees.sql`
- Modify: `src/lib/database.types.ts`
- Modify: `src/features/members/useScheduleRotation.ts`
- Modify: `src/features/members/ScheduleRotationPanel.tsx`
- Modify: `src/features/schedule-history/ScheduleHistoryPage.tsx`
- Modify: `src/features/schedules/useSchedules.ts`
- Modify: `src/schedule-rotation.css`
- Modify: `tests/domain/schedule-rotation.test.mjs`
- Modify: `tests/ui/schedule-rotation.test.mjs`

- [ ] Add failing tests for custom names without login, assignee CRUD authorization, rotation selection by assignee ID, and occurrence snapshot labels.
- [ ] Run focused tests and verify the expected failure.
- [ ] Add `household_assignees` with household scope, display name, optional linked user, active state, timestamps, RLS, and owner/admin RPCs.
- [ ] Add `assignee_id` to rotation days and occurrences, snapshotting it during generation and future rotation updates without rewriting completed/past rows.
- [ ] Update hooks and typed RPC contracts to use assignees; retain legacy `assigned_to` only for linked-user compatibility during migration.
- [ ] Replace the member-only rotation UI with named assignee management and a clean weekday grid.
- [ ] Update schedule history to display the assignee display name, including non-login people.
- [ ] Run focused tests and verify they pass.

### Task 4: Full Verification And QA

**Files:**
- Modify: `docs/QA_REPORT.md`

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Record browser/device scan limitations and Supabase local verification status without claiming visual or live DB PASS when unavailable.
