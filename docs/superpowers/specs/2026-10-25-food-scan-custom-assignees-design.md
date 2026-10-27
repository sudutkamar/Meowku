# Food Scan And Custom Assignees

## Goal

Make cat care focused and reliable by removing the expense tab from the cat detail workspace, adding barcode/OCR food intake with review-before-save, and allowing schedule assignments to named household people who do not need accounts.

## Scope

- Cat detail exposes only Ringkasan, Kesehatan & vaksin, and Makanan.
- Food scan supports camera barcode detection when available and image-label OCR fallback through an authenticated Edge Function. Both produce a draft; the user confirms or edits before persistence.
- Add household-scoped assignees with a display name and optional linked authenticated user. Rotation days and future occurrence snapshots reference the assignee record, not `auth.users` directly.
- Existing completion authorization remains based on the logged-in household member. A named non-login assignee is a responsibility label, not an authentication identity.

## Safety And Data Rules

- No scan result is automatically trusted or written as a confirmed food product.
- External barcode/OCR lookups are server-side and return only normalized draft fields.
- RLS restricts assignees and rotations to household members; only owner/admin can manage them.
- Existing occurrence history remains immutable. Updating a rotation only affects future incomplete occurrences without an assignment snapshot.
- Existing food, expense, report, and audit data remain queryable.

## UI

- Food panel gets two clear actions: `Scan barcode` and `Foto label`, with an inline scan state and editable draft fields for brand, product name, type, variant, and barcode.
- Assignment editor has a compact assignee management area and a Monday-Sunday grid with named people.
- Empty/error states explain camera permission, unavailable scanner, lookup failure, and manual fallback in Indonesian.
