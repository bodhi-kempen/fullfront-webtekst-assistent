import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Hard-coded fallbacks for the public Supabase URL + anon (publishable) key.
// Both are safe to ship in client code — the anon key is, by design, a
// public credential gated by Row Level Security on the database side.
//
// Why: Railway's Docker build doesn't reliably forward service env vars at
// build time, which left the production bundle without Supabase config and
// React failed to render. Falling back to known-good values guarantees the
// app boots even if `VITE_*` vars are missing in the build environment.
const SUPABASE_URL_FALLBACK = 'https://rttqlpnsybdkhllslwwe.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK = 'sb_publishable_YbgUyg8EPSS8gWDZaxLhrA_X3kyUtqM';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK
    ),
  },
});
