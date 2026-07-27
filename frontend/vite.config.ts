import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Validate Supabase env vars at build time and fail loudly if they're missing.
// loadEnv() merges .env files + process.env, so this works for both:
//   local dev:  VITE_SUPABASE_* in frontend/.env (gitignored)
//   Railway:    VITE_SUPABASE_* as env vars on the frontend service
//
// Without this check a missing var silently produces a white screen in
// production — the error should appear in the build log, not at runtime.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [
      !supabaseUrl && 'VITE_SUPABASE_URL',
      !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
    ].filter(Boolean);
    console.error(
      `\n✗ Build afgebroken: VITE_SUPABASE_ANON_KEY ontbreekt tijdens build — zet deze in Railway env vars (frontend service) of in frontend/.env voor lokale builds.\n` +
        `  Ontbrekende variabelen: ${missing.join(', ')}\n`
    );
    process.exit(1);
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
  };
});
