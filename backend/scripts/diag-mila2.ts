import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const PID = '166a472d-cdb7-448a-bbeb-983014100bcb';

async function main() {
  const { data, error } = await admin.from('projects').select('*').eq('id', PID);
  console.log('Error:', error?.message);
  console.log('Rows:', data?.length);
  console.log(JSON.stringify(data, null, 2));
}
void main();
