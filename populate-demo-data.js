import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE config in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Fetching workflows...")
  const { data: workflows, error: wfError } = await supabase.from('workflows').select('*')
  if (wfError) {
    console.error("Error fetching workflows:", wfError)
    return
  }

  if (!workflows || workflows.length === 0) {
    console.log("No workflows found to populate.")
    return
  }

  console.log(`Found ${workflows.length} workflows. Populating data...`)

  for (const workflow of workflows) {
    const components = workflow.components || []
    if (components.length === 0) continue

    console.log(`\nPopulating workflow: ${workflow.name} (${workflow.id})`)

    const traceId = `trace_${Math.random().toString(36).substring(7)}_${Date.now()}`
    const entityId = `demo_entity_${Math.floor(Math.random() * 1000)}`
    
    // Create base timestamp 5 minutes ago
    const baseTime = Date.now() - 5 * 60 * 1000
    
    let timeOffset = 0
    let parentSpanId = null

    for (let i = 0; i < components.length; i++) {
      const comp = components[i]
      const compId = comp.id
      const spanId = `span_${Math.random().toString(36).substring(7)}`
      
      const durationMs = Math.floor(Math.random() * 50) + 10 // 10-60ms
      const status = Math.random() > 0.9 ? 'critical' : (Math.random() > 0.8 ? 'warning' : 'healthy')
      
      const eventTime = new Date(baseTime + timeOffset).toISOString()
      
      // 1. Insert Event (Trace)
      await supabase.from('events').insert({
        workflow_id: workflow.id,
        component_id: compId,
        entity_id: entityId,
        status: status,
        duration_ms: durationMs,
        message: `Processed at ${comp.name}`,
        span_id: spanId,
        parent_span_id: parentSpanId,
        created_at: eventTime
      })
      
      // 2. Insert Logs
      await supabase.from('logs').insert([
        {
          workflow_id: workflow.id,
          component_id: compId,
          trace_id: traceId,
          span_id: spanId,
          severity_text: 'INFO',
          body: `Starting processing for ${entityId}`,
          attributes: { "user.id": "demo_user" },
          timestamp: new Date(baseTime + timeOffset).toISOString()
        },
        {
          workflow_id: workflow.id,
          component_id: compId,
          trace_id: traceId,
          span_id: spanId,
          severity_text: status === 'critical' ? 'ERROR' : 'DEBUG',
          body: status === 'critical' ? `Connection timeout to downstream` : `Completed in ${durationMs}ms`,
          attributes: { "duration": durationMs },
          timestamp: new Date(baseTime + timeOffset + durationMs).toISOString()
        }
      ])
      
      // 3. Insert Metrics (Latency, TPS, CPU)
      const isSpike = status === 'critical'
      
      await supabase.from('metrics').insert([
        {
          workflow_id: workflow.id,
          component_id: compId,
          metric_name: 'latency_ms',
          value: isSpike ? durationMs * 5 : durationMs,
          trace_id: isSpike ? traceId : null,
          created_at: eventTime
        },
        {
          workflow_id: workflow.id,
          component_id: compId,
          metric_name: 'throughput_rps',
          value: Math.floor(Math.random() * 100) + 50,
          trace_id: null,
          created_at: eventTime
        },
        {
          workflow_id: workflow.id,
          component_id: compId,
          metric_name: 'cpu_percent',
          value: isSpike ? 95 : Math.floor(Math.random() * 30) + 10,
          trace_id: isSpike ? traceId : null,
          created_at: eventTime
        }
      ])
      
      // 4. Insert Profile (Flamegraph) - for every component
      const profileData = {
        name: `${comp.name}::handleRequest`,
        value: durationMs * 1000, // microseconds
        children: [
          {
            name: `validatePayload`,
            value: (durationMs * 1000) * 0.2,
            children: []
          },
          {
            name: `executeBusinessLogic`,
            value: (durationMs * 1000) * 0.7,
            children: [
              {
                name: `db.query`,
                value: (durationMs * 1000) * 0.5,
                children: []
              }
            ]
          }
        ]
      }
      
      await supabase.from('profiles').insert({
        workflow_id: workflow.id,
        component_id: compId,
        trace_id: traceId,
        profile_data: profileData,
        created_at: eventTime
      })
      
      timeOffset += durationMs + 5 // Next span starts slightly after
      parentSpanId = spanId // Chain them together for a linear trace
      console.log(`  - Populated ${comp.name}`)
    }
  }
  
  console.log("\nDone! Demo data successfully populated.")
}

run().catch(console.error)
