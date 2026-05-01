import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Service-role client. Bypasses RLS — only use on the backend.
export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
