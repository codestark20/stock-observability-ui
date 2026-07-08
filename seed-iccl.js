import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
async function run() {
  const components = [
    { id: 'demo_iccl_trade', name: 'Trade Ingestion', manager: 'BSE Link', sla: '99.99%', role: 'start', linkUsage: 'Validates raw trade from exchange', latency: '2ms', tps: '150k/sec', cpu: '20%' },
    { id: 'demo_iccl_netting', name: 'Netting Engine', manager: 'Clearing Ops', sla: '99.95%', role: 'intermediate', linkUsage: 'Calculates net obligations per broker', latency: '45ms', tps: '80k/sec', cpu: '65%' },
    { id: 'demo_iccl_margin', name: 'Risk & Margin', manager: 'Risk Dept', sla: '99.9%', role: 'intermediate', linkUsage: 'Validates collateral vs obligations', latency: '15ms', tps: '80k/sec', cpu: '40%' },
    { id: 'demo_iccl_depository', name: 'Depositories', manager: 'CDSL/NSDL', sla: '< 500ms', role: 'intermediate', linkUsage: 'Transfers securities for Settlement No', latency: '250ms', tps: '10k/sec', cpu: '30%' },
    { id: 'demo_iccl_bank', name: 'Clearing Banks', manager: 'Banking Ops', sla: '99.5%', role: 'end', linkUsage: 'Transfers funds for Settlement No', latency: '120ms', tps: '5k/sec', cpu: '45%' }
  ]
  const nodes = [
    { id: 'demo_iccl_trade', type: 'builderNode', position: { x: 350, y: 0 }, data: { name: 'Trade Ingestion', manager: 'BSE Link', sla: '99.99%', role: 'start', linkUsage: 'Validates raw trade from exchange', componentId: 'demo_iccl_trade' } },
    { id: 'demo_iccl_netting', type: 'builderNode', position: { x: 350, y: 280 }, data: { name: 'Netting Engine', manager: 'Clearing Ops', sla: '99.95%', role: 'intermediate', linkUsage: 'Calculates net obligations per broker', componentId: 'demo_iccl_netting' } },
    { id: 'demo_iccl_margin', type: 'builderNode', position: { x: 50, y: 280 }, data: { name: 'Risk & Margin', manager: 'Risk Dept', sla: '99.9%', role: 'intermediate', linkUsage: 'Validates collateral vs obligations', componentId: 'demo_iccl_margin' } },
    { id: 'demo_iccl_depository', type: 'builderNode', position: { x: 200, y: 560 }, data: { name: 'Depositories', manager: 'CDSL/NSDL', sla: '< 500ms', role: 'intermediate', linkUsage: 'Transfers securities for Settlement No', componentId: 'demo_iccl_depository' } },
    { id: 'demo_iccl_bank', type: 'builderNode', position: { x: 500, y: 560 }, data: { name: 'Clearing Banks', manager: 'Banking Ops', sla: '99.5%', role: 'end', linkUsage: 'Transfers funds for Settlement No', componentId: 'demo_iccl_bank' } }
  ]
  const edges = [
    { id: 'e_trade_netting', source: 'demo_iccl_trade', target: 'demo_iccl_netting', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
    { id: 'e_trade_margin', source: 'demo_iccl_trade', target: 'demo_iccl_margin', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
    { id: 'e_netting_depository', source: 'demo_iccl_netting', target: 'demo_iccl_depository', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
    { id: 'e_netting_bank', source: 'demo_iccl_netting', target: 'demo_iccl_bank', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
    { id: 'e_margin_netting', source: 'demo_iccl_margin', target: 'demo_iccl_netting', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } }
  ]
  const newId = "wf_" + Date.now()
  await supabase.from('workflows').insert({
    id: newId, name: 'T+1 Settlement Pipeline', common_link: 'Settlement No', components, nodes, edges, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  })
  console.log('Successfully seeded ICCL T+1 Settlement Pipeline!')
}
run().catch(console.error)
