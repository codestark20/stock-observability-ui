// Simulate what the frontend does: fetch metrics with anon key for the workflow
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const workflowId = 'wf_1781669736070_wzctdg';

// This is EXACTLY what WorkflowDashboard.jsx does on lines 215-235
const { data: metricsRows, error: metricsErr } = await supabase
  .from('metrics')
  .select('*')
  .eq('workflow_id', workflowId)
  .order('created_at', { ascending: true })
  .limit(500);

console.log('Metrics rows:', metricsRows?.length, 'Error:', metricsErr);

if (metricsRows && metricsRows.length > 0) {
  // Group by component_id and metric_name (same as dashboard code)
  const grouped = {};
  for (const m of metricsRows) {
    if (!grouped[m.component_id]) grouped[m.component_id] = {};
    if (!grouped[m.component_id][m.metric_name]) grouped[m.component_id][m.metric_name] = [];
    grouped[m.component_id][m.metric_name].push(m);
  }
  console.log('\nGrouped metrics:');
  for (const [compId, metrics] of Object.entries(grouped)) {
    console.log(`  ${compId}:`);
    for (const [name, values] of Object.entries(metrics)) {
      console.log(`    ${name}: ${values.length} data points`);
    }
  }
}

// Also check logs
const { data: logsRows, error: logsErr } = await supabase
  .from('logs')
  .select('*')
  .eq('workflow_id', workflowId)
  .order('timestamp', { ascending: false })
  .limit(500);

console.log('\nLogs rows:', logsRows?.length, 'Error:', logsErr);
if (logsRows && logsRows.length > 0) {
  console.log('Sample log:', JSON.stringify(logsRows[0], null, 2));
}
