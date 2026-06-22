import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id: workflowId } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  if (!workflowId) {
    return res.status(400).json({ error: 'Workflow ID is required' })
  }

  try {
    // Call the Postgres RPC function instead of downloading all rows to Vercel
    const { data, error } = await supabase.rpc('get_workflow_analytics', {
      p_workflow_id: workflowId
    })

    if (error) {
      console.error('Supabase RPC Error:', error)
      throw error
    }

    // The RPC returns the exact JSON shape expected by the frontend
    return res.status(200).json(data)

  } catch (err) {
    console.error('Error in analytics API:', err)
    return res.status(500).json({ error: err.message })
  }
}
