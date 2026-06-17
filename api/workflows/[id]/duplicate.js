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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const { id } = req.query

  try {
    // Fetch the original workflow
    const { data: original, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!original) return res.status(404).json({ error: 'Workflow not found' })

    // Generate a new unique ID
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const newId = `wf_${Date.now()}_${randomSuffix}`
    const now = new Date().toISOString()

    // Create the duplicate
    const { data: duplicate, error: insertError } = await supabase
      .from('workflows')
      .insert({
        id: newId,
        name: `${original.name} (Copy)`,
        common_link: original.common_link,
        components: original.components,
        nodes: original.nodes,
        edges: original.edges,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (insertError) throw insertError

    const { common_link, ...rest } = duplicate
    return res.status(201).json({ ...rest, commonLink: common_link })
  } catch (err) {
    console.error(`Error in /api/workflows/${id}/duplicate:`, err)
    return res.status(500).json({ error: err.message })
  }
}
