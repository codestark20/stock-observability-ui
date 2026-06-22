import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const keyToUse = supabaseServiceKey || supabaseAnonKey;

const supabase = createClient(supabaseUrl, keyToUse);

async function testFetch() {
  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .eq('workflow_id', 'wf_1781669736070_wzctdg')
    .order('created_at', { ascending: true })
    .limit(5);
    
  console.log("METRICS FETCH:", data ? data.length : 0, error);
}

testFetch();
