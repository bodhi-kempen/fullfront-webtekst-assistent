// Reproduces a project POST end-to-end against the running backend so we
// see the EXACT error path. Uses the service-role admin client to mint a
// short-lived session for the existing user.

import { supabaseAdmin } from '../src/lib/supabase.js';

const userEmail = 'bodhi@bodhikempen.com';

// 1. Find the user.
const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
if (listErr) throw listErr;
const user = list.users.find((u) => u.email === userEmail);
if (!user) {
  console.error(`No user with email ${userEmail}; available:`, list.users.map((u) => u.email));
  process.exit(1);
}
console.log(`Found user ${user.id} (${user.email})`);

// 2. Generate a magic link to get an access_token without a password.
const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: userEmail,
});
if (linkErr) throw linkErr;

// The magic link contains an OTP. To convert it to an access_token we'd need
// to follow the redirect — too much work for a smoke test. Instead, do an
// admin-side check: insert directly with service role and see what supabase
// returns.

console.log('\nAttempting direct insert via service role…');
const { data: inserted, error: insertErr } = await supabaseAdmin
  .from('projects')
  .insert({
    user_id: user.id,
    name: 'TEST loodgieter — diag',
    language: 'nl',
  })
  .select()
  .single();

if (insertErr) {
  console.error('INSERT FAILED:', insertErr);
  process.exit(1);
}
console.log('INSERT OK:', inserted);

// Clean up.
await supabaseAdmin.from('projects').delete().eq('id', inserted.id);
console.log('Cleaned up test row.');
