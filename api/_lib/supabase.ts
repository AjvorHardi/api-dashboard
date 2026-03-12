import { createClient } from '@supabase/supabase-js'

import { getApiEnv } from './env'

export function getAdminClient() {
  const env = getApiEnv()

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
