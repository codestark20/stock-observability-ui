import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const { id } = req.query

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('workflow_id', id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return res.status(200).json(data)
  } catch (err) {
    console.error(`Error in /api/workflows/${id}/events:`, err)
    return res.status(500).json({ error: err.message })
  }
}
