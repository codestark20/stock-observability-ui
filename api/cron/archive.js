import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    const { error } = await supabase.rpc('archive_old_events')

    if (error) {
      throw error
    }

    return res.status(200).json({ success: true, message: 'Archive job executed successfully' })
  } catch (err) {
    console.error('Error in archive cron:', err)
    return res.status(500).json({ error: err.message })
  }
}
