import { supabaseAdmin } from '../src/lib/supabase.js';

// Try to read the new column. If it doesn't exist, supabase-js returns
// a specific error code.
const { data, error } = await supabaseAdmin
  .from('projects')
  .select('id, interview_meta')
  .limit(1);

if (error) {
  console.log('ERROR:', error.code, error.message);
  if (error.message.toLowerCase().includes('interview_meta')) {
    console.log('\n→ Migration 004 has NOT been applied. Run migration 004 to add the column.');
  }
} else {
  console.log('OK: interview_meta column exists.');
  console.log('Sample row:', data?.[0] ?? '(none)');
}

// Also check phase constraint by attempting to insert phase=10 into a tmp row.
// We'll do a non-destructive check: inspect pg_constraint via RPC isn't easily
// possible, so just verify the column exists and trust the user.
process.exit(error ? 1 : 0);
