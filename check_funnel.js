import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check if traces table exists and has rows
const { data: traces, error: tracesError } = await supabase
  .from('traces')
  .select('*')
  .limit(3);

console.log('Traces table check:');
console.log('  Error:', tracesError?.message || 'none');
console.log('  Row count (sample):', traces?.length);
if (traces?.length > 0) console.log('  Sample row keys:', Object.keys(traces[0]));

// Check the live funnel endpoint
const res = await fetch('https://stock-observability-ui.vercel.app/api/workflows/wf_1781669736070_wzctdg/funnel');
console.log('\nFunnel API response status:', res.status);
const body = await res.text();
console.log('Funnel API body:', body.slice(0, 500));
