import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('workflows').select('id, name');
  const wf = data.find(w => w.name === 'Order Fulfillment Pipeline');
  console.log("FOUND WORKFLOW ID:", wf.id);
  
  // Auto-update the test script!
  let testFile = fs.readFileSync('test-otel.js', 'utf8');
  testFile = testFile.replace('REPLACE_WITH_YOUR_WORKFLOW_ID', wf.id);
  testFile = testFile.replace('REPLACE_WITH_A_NODE_ID', 'Checkout Service');
  fs.writeFileSync('test-otel.js', testFile);
  console.log("Successfully auto-filled test-otel.js!");
}
run();
