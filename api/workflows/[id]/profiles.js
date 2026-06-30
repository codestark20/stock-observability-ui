import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not configured' });
  }

  try {
    const { id, componentId, traceId } = req.query;

    if (!id || !componentId) {
      return res.status(400).json({ error: 'Missing workflow id or componentId' });
    }

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('workflow_id', id)
      .eq('component_id', componentId);

    if (traceId) {
      query = query.eq('trace_id', traceId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10); // just get recent profiles

    if (error) throw error;

    return res.status(200).json({ profiles: data });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return res.status(500).json({ error: error.message });
  }
}
