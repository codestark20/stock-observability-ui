import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Falling back to localStorage mode.')
}

const keyToUse = supabaseServiceKey || supabaseAnonKey

export const supabase = supabaseUrl && keyToUse
  ? createClient(supabaseUrl, keyToUse, {
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    })
  : null

export const isSupabaseEnabled = !!supabase
