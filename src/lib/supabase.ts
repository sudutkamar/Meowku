import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
const localUrlInProduction = Boolean(import.meta.env.PROD && url && /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(url));

export const supabaseConfigured = Boolean(url && key && !localUrlInProduction);
export const supabaseConfigurationError = localUrlInProduction
  ? 'Build production memakai URL Supabase lokal. Gunakan .env production, bukan .env.development.local.'
  : null;
export const supabase = url && key && !localUrlInProduction ? createClient<Database>(url, key) : null;
