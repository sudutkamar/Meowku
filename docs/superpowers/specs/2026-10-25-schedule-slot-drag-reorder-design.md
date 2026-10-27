# Schedule Slot Drag Reorder

## Goal

Allow users to reorder schedule slots visually in the schedule configuration form. The new order must remain the source of truth for slot `sort_order`, schedule editing, and checklist display.

## Interaction

- Each active slot row exposes a visible drag handle.
- Dragging starts only from the handle so text and time inputs remain usable.
- The dragged row and drop target receive visual feedback.
- Dropping reorders the local slot array immediately.
- Keyboard users can move a focused slot up or down with explicit buttons.
- Removing a slot preserves existing archive semantics for persisted slots.

## Data Flow

- The form keeps the reordered slot array in React state.
- Reordering rewrites `sort_order` from zero in display order.
- Create and update mutations already send the complete `slots` payload to the database RPC.
- Hydration sorts slots by persisted `sort_order`; checklist rendering keeps chronological behavior independent from display edits.

## Boundaries

- No new drag-and-drop dependency.
- No change to occurrence identity or historical records.
- Inactive slots are not draggable or displayed as active rows.
- The existing validation remains responsible for labels and valid local times.

## Verification

- Contract test covers drag handle, reorder handlers, keyboard fallback, and persisted `sort_order` mapping.
- Full tests, typecheck, and production build must pass.
