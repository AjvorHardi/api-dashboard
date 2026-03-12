export type DashboardConfig = {
  adminToken: string
  apiBaseUrl: string
  projectSlug: string
  supabaseAnonKey: string
  supabaseUrl: string
}

const STORAGE_KEY = 'events-dashboard-config'

const envDefaults: DashboardConfig = {
  adminToken: '',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  projectSlug: import.meta.env.VITE_DEFAULT_PROJECT_SLUG ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
}

export function loadDashboardConfig(): DashboardConfig {
  if (typeof window === 'undefined') {
    return envDefaults
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return envDefaults
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>
    return { ...envDefaults, ...parsed }
  } catch {
    return envDefaults
  }
}

export function saveDashboardConfig(config: DashboardConfig) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
