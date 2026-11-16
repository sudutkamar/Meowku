# Migrations & Squash Plan
- Canonical baseline: supabase/migrations after squash (not yet performed).
- Naming: YYYYMMDDHHMMSS_description.sql
- One function one signature; drop before redefine.
- Do not squash existing environments (destructive).
