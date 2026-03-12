import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null
let cachedSignature = ''

export function getSupabaseClient(url: string, anonKey: string) {
  const signature = `${url}::${anonKey}`

  if (cachedClient && cachedSignature === signature) {
    return cachedClient
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
  cachedSignature = signature

  return cachedClient
}
