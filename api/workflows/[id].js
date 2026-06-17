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

  const { id } = req.query

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Workflow not found' })

      const { common_link, ...rest } = data
      return res.status(200).json({ ...rest, commonLink: common_link })
    }

    if (req.method === 'PUT') {
      const { name, commonLink, components, nodes, edges } = req.body

      const updates = { updated_at: new Date().toISOString() }
      if (name !== undefined) updates.name = name
      if (commonLink !== undefined) updates.common_link = commonLink
      if (components !== undefined) updates.components = components
      if (nodes !== undefined) updates.nodes = nodes
      if (edges !== undefined) updates.edges = edges

      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Workflow not found' })

      const { common_link, ...rest } = data
      return res.status(200).json({ ...rest, commonLink: common_link })
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id)

      if (error) throw error
      return res.status(200).json({ success: true, id })
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (err) {
    console.error(`Error in /api/workflows/${id}:`, err)
    return res.status(500).json({ error: err.message })
  }
}
