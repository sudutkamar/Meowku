# Cat Detail Compact Care Workspace

## Goal

Make the cat detail page feel like a focused care workspace instead of a sparse page with a decorative tab strip.

## Design

- Keep the existing route, Supabase queries, and four care tabs unchanged.
- Replace the loose detail heading with a compact identity header containing back navigation, cat icon, name, metadata, and a clear profile action.
- Keep the active tab immediately below the identity header and style it as a connected segmented navigation surface.
- Preserve the existing care panel content and empty/loading/error behavior.
- Add responsive rules so metadata wraps, controls remain usable, and tabs scroll horizontally on narrow screens.
- Add explicit dark-mode surfaces and text colors for the new detail-page elements.

## Constraints

- No mock or hardcoded business data.
- No route or database contract changes.
- Preserve Indonesian labels and the existing orange/cream visual language.
- Verify with the existing test suite, typecheck, and production build.
