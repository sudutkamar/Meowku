/**
 * Manual/Playwright release checklist. Run against a configured local Supabase
 * instance when Docker is available; the contract tests remain runnable offline.
 */
export const criticalFlows = [
  'sign in and create a household',
  'create, update, and archive a cat, litter box, and catalog item',
  'generate a schedule and complete a target occurrence',
  'filter the report and inspect immutable history',
  'invite, change role, and remove a household member',
  'update timezone and export only the authenticated household',
] as const;
