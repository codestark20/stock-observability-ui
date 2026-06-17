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

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const workflows = data.map(({ common_link, ...rest }) => ({
        ...rest,
        commonLink: common_link,
      }))

      return res.status(200).json(workflows)
    }

    if (req.method === 'POST') {
      const { id, name, commonLink, components, nodes, edges } = req.body

      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          id,
          name,
          common_link: commonLink || null,
          components: components || [],
          nodes: nodes || [],
          edges: edges || [],
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw error

      const { common_link, ...rest } = data
      return res.status(201).json({ ...rest, commonLink: common_link })
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (err) {
    console.error('Error in /api/workflows:', err)
    return res.status(500).json({ error: err.message })
  }
}
