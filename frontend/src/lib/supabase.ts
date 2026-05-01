import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env'
  );
}

// Log the URL (not the key) at boot so we can confirm in production that
// the right Supabase project and the right keys were baked into the build.
// The key prefix is logged separately to verify it's not a stale/wrong key
// without leaking the full secret.
console.info(
  `[supabase] url=${url} keyPrefix=${anonKey.slice(0, 12)}… len=${anonKey.length}`
);

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
