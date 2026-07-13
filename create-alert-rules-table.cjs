// Run this with: node --env-file=.env.local create-alert-rules-table.cjs
// Uses the Supabase REST API pattern of inserting to trigger table creation check
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Check if table already exists
  const { error: checkErr } = await sb.from('alert_rules').select('id').limit(1)
  if (!checkErr) {
    console.log('✅ alert_rules table already exists')
    return
  }

  console.log('Table missing, creating via Supabase pg function...')

  // Call a postgres function to create the table (requires the function to exist)
  // Instead, use the raw SQL endpoint via the service role key
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/rpc/exec_sql'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      sql: [
        'CREATE TABLE IF NOT EXISTS alert_rules (',
        '  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,',
        '  workflow_id text NOT NULL,',
        '  component_id text NOT NULL,',
        '  metric_name text NOT NULL,',
        '  threshold float8 NOT NULL,',
        '  condition text NOT NULL DEFAULT \'gt\',',
        '  severity text NOT NULL DEFAULT \'warning\',',
        '  slack_webhook_url text,',
        '  cooldown_minutes int NOT NULL DEFAULT 15,',
        '  last_fired_at timestamptz,',
        '  created_at timestamptz DEFAULT now()',
        ');'
      ].join(' ')
    })
  })

  const text = await res.text()
  console.log('Status:', res.status, text)
}

main().catch(console.error)
