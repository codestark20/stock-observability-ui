import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  // 1. Check workflows
  const { data: wf } = await supabase.from('workflows').select('id, name, components').limit(4)
  console.log('\n=== WORKFLOWS ===')
  for (const w of wf || []) {
    const compIds = (w.components || []).map(c => c.id)
    console.log(`  ${w.name} | id=${w.id} | components: [${compIds.join(', ')}]`)
  }

  if (!wf || wf.length === 0) return

  const wfId = wf[0].id
  const compId = wf[0].components?.[0]?.id

  console.log(`\n=== Testing with workflow: ${wf[0].name} ===`)
  console.log(`    workflow_id: ${wfId}`)
  console.log(`    component_id: ${compId}`)

  // 2. Check metrics
  const { data: metrics, error: mErr } = await supabase
    .from('metrics')
    .select('component_id, metric_name, value, created_at')
    .eq('workflow_id', wfId)
    .limit(5)
  console.log('\n=== METRICS (first 5) ===')
  if (mErr) console.log('  ERROR:', mErr.message)
  else if (!metrics?.length) console.log('  ⚠️  NO METRICS FOUND for this workflow_id')
  else metrics.forEach(m => console.log(`  ${m.component_id} | ${m.metric_name} = ${m.value} @ ${m.created_at}`))

  // 3. Check logs
  const { data: logs, error: lErr } = await supabase
    .from('logs')
    .select('component_id, severity_text, body, timestamp')
    .eq('workflow_id', wfId)
    .limit(5)
  console.log('\n=== LOGS (first 5) ===')
  if (lErr) console.log('  ERROR:', lErr.message)
  else if (!logs?.length) console.log('  ⚠️  NO LOGS FOUND for this workflow_id')
  else logs.forEach(l => console.log(`  [${l.severity_text}] ${l.body} @ ${l.timestamp}`))

  // 4. Check profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('component_id, created_at')
    .eq('workflow_id', wfId)
    .limit(5)
  console.log('\n=== PROFILES (first 5) ===')
  if (pErr) console.log('  ERROR:', pErr.message)
  else if (!profiles?.length) console.log('  ⚠️  NO PROFILES FOUND — profiles table may not exist or migration not run')
  else profiles.forEach(p => console.log(`  ${p.component_id} @ ${p.created_at}`))

  console.log('\n=== DIAGNOSIS COMPLETE ===')
}

diagnose().catch(console.error)
