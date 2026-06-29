import { createClient } from '@supabase/supabase-js'
import { onSocketEvent } from './realtimeStatus'

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

if (supabase) {
  // Hook into Realtime socket lifecycle
  const transport = supabase.realtime.conn?.transport;
  if (transport) {
    transport.addEventListener('open', () => onSocketEvent('open'));
    transport.addEventListener('close', () => onSocketEvent('close'));
    transport.addEventListener('error', () => onSocketEvent('error'));
  }

  // Also listen to channel-level events
  supabase.realtime.onOpen(() => onSocketEvent('open'));
  supabase.realtime.onClose(() => onSocketEvent('close'));
  supabase.realtime.onError(() => onSocketEvent('error'));
}
