export type ApiEnv = {
  appUrl: string | null
  adminToken: string
  supabaseServiceRoleKey: string
  supabaseUrl: string
}

export function getApiEnv(): ApiEnv {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminToken = process.env.PROJECT_ADMIN_TOKEN

  if (!supabaseUrl || !supabaseServiceRoleKey || !adminToken) {
    throw new Error(
      'Missing required env vars. Expected SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and PROJECT_ADMIN_TOKEN.',
    )
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    adminToken,
    appUrl: process.env.APP_URL ?? null,
  }
}
