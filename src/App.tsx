
import { type FormEvent, startTransition, useDeferredValue, useEffect, useState } from 'react'

import './App.css'
import { ActivityChart } from './components/ActivityChart'
import { EventFeed } from './components/EventFeed'
import { loadDashboardConfig, saveDashboardConfig, type DashboardConfig } from './lib/config'
import { getSupabaseClient } from './lib/supabase'
import type { CreateProjectResponse, EventRecord, ProjectRecord } from './lib/types'

const EVENT_LIMIT = 400

type ConnectionState = 'idle' | 'connecting' | 'live' | 'offline'

type ProjectCreationState = {
  apiKey: string
  error: string | null
  ingestUrl: string
  name: string
  slug: string
  submitting: boolean
}

function App() {
  const [config, setConfig] = useState<DashboardConfig>(loadDashboardConfig)
  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [search, setSearch] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [creationState, setCreationState] = useState<ProjectCreationState>({
    apiKey: '',
    error: null,
    ingestUrl: '',
    name: '',
    slug: '',
    submitting: false,
  })
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())

  useEffect(() => {
    saveDashboardConfig(config)
  }, [config])

  useEffect(() => {
    if (!config.supabaseUrl || !config.supabaseAnonKey || !config.projectSlug) {
      setProject(null)
      setEvents([])
      setConnectionState('idle')
      setError(null)
      return
    }

    const supabase = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
    let isCancelled = false

    async function loadProjectData() {
      setLoading(true)
      setError(null)
      setConnectionState('connecting')

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug, created_at')
        .eq('slug', config.projectSlug)
        .maybeSingle()

      if (isCancelled) {
        return
      }

      if (projectError) {
        setError(projectError.message)
        setProject(null)
        setEvents([])
        setConnectionState('offline')
        setLoading(false)
        return
      }

      if (!projectData) {
        setError(`Project "${config.projectSlug}" was not found.`)
        setProject(null)
        setEvents([])
        setConnectionState('offline')
        setLoading(false)
        return
      }

      setProject(projectData)

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, project_id, channel, title, description, icon, tags, occurred_at, created_at')
        .eq('project_id', projectData.id)
        .order('occurred_at', { ascending: false })
        .limit(EVENT_LIMIT)

      if (isCancelled) {
        return
      }

      if (eventError) {
        setError(eventError.message)
        setEvents([])
        setConnectionState('offline')
        setLoading(false)
        return
      }

      startTransition(() => {
        setEvents(eventData ?? [])
      })

      const channel = supabase
        .channel(`events-${projectData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            filter: `project_id=eq.${projectData.id}`,
            schema: 'public',
            table: 'events',
          },
          (payload) => {
            const newEvent = payload.new as EventRecord

            startTransition(() => {
              setEvents((currentEvents) => {
                if (currentEvents.some((event) => event.id === newEvent.id)) {
                  return currentEvents
                }

                return [newEvent, ...currentEvents].slice(0, EVENT_LIMIT)
              })
            })
          },
        )
        .subscribe((status) => {
          if (isCancelled) {
            return
          }

          if (status === 'SUBSCRIBED') {
            setConnectionState('live')
            return
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionState('offline')
            return
          }

          setConnectionState('connecting')
        })

      setLoading(false)

      return () => {
        supabase.removeChannel(channel)
      }
    }

    let cleanup: (() => void) | undefined

    loadProjectData()
      .then((teardown) => {
        cleanup = teardown
      })
      .catch((loadError) => {
        if (isCancelled) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Failed to load dashboard.'
        setError(message)
        setConnectionState('offline')
        setLoading(false)
      })

    return () => {
      isCancelled = true
      cleanup?.()
    }
  }, [config.projectSlug, config.supabaseAnonKey, config.supabaseUrl])

  const channels = Array.from(new Set(events.map((event) => event.channel))).sort((left, right) =>
    left.localeCompare(right),
  )

  const filteredEvents = events.filter((event) => {
    if (selectedChannel !== 'all' && event.channel !== selectedChannel) {
      return false
    }

    if (!deferredSearch) {
      return true
    }

    const haystack = [event.channel, event.title, event.description ?? '', ...event.tags]
      .join(' ')
      .toLowerCase()

    return haystack.includes(deferredSearch)
  })

  const lastEvent = filteredEvents[0] ?? events[0] ?? null

  async function handleProjectCreation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!config.apiBaseUrl) {
      setCreationState((currentState) => ({
        ...currentState,
        error: 'API base URL is required to create projects.',
      }))
      return
    }

    if (!config.adminToken) {
      setCreationState((currentState) => ({
        ...currentState,
        error: 'Admin token is required to create projects.',
      }))
      return
    }

    if (!creationState.name.trim()) {
      setCreationState((currentState) => ({
        ...currentState,
        error: 'Project name is required.',
      }))
      return
    }

    setCreationState((currentState) => ({
      ...currentState,
      error: null,
      submitting: true,
    }))

    try {
      const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, '')}/api/projects`, {
        body: JSON.stringify({
          name: creationState.name,
          slug: creationState.slug || undefined,
        }),
        headers: {
          'content-type': 'application/json',
          'x-admin-token': config.adminToken,
        },
        method: 'POST',
      })

      const payload = (await response.json().catch(() => null)) as
        | CreateProjectResponse
        | { error?: string }
        | null

      if (!response.ok || !payload || !('project' in payload)) {
        throw new Error(
          payload && 'error' in payload && payload.error
            ? payload.error
            : 'Project creation failed.',
        )
      }

      setConfig((currentConfig) => ({
        ...currentConfig,
        projectSlug: payload.project.slug,
      }))
      setCreationState({
        apiKey: payload.apiKey,
        error: null,
        ingestUrl: payload.ingestUrl,
        name: '',
        slug: '',
        submitting: false,
      })
    } catch (creationError) {
      const message =
        creationError instanceof Error ? creationError.message : 'Project creation failed.'

      setCreationState((currentState) => ({
        ...currentState,
        error: message,
        submitting: false,
      }))
    }
  }

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Realtime monitoring</p>
          <h1>Events Dashboard</h1>
          <p className="hero-copy">
            Accept events through a remote API, then inspect them locally with live updates,
            channel filters, full-text search, and recent activity charts.
          </p>
        </div>
        <div className={`status-pill status-${connectionState}`}>
          <span className="status-dot" />
          {connectionState === 'idle' ? 'Waiting for configuration' : connectionState}
        </div>
      </header>

      <main className="layout">
        <section className="panel controls-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Setup</p>
              <h2>Connection</h2>
            </div>
            <p className="panel-meta">Saved locally in your browser</p>
          </div>

          <div className="form-grid">
            <label>
              <span>Supabase URL</span>
              <input
                placeholder="https://your-project.supabase.co"
                value={config.supabaseUrl}
                onChange={(event) =>
                  setConfig((currentConfig) => ({
                    ...currentConfig,
                    supabaseUrl: event.target.value.trim(),
                  }))
                }
              />
            </label>

            <label>
              <span>Supabase anon key</span>
              <input
                placeholder="eyJ..."
                value={config.supabaseAnonKey}
                onChange={(event) =>
                  setConfig((currentConfig) => ({
                    ...currentConfig,
                    supabaseAnonKey: event.target.value.trim(),
                  }))
                }
              />
            </label>

            <label>
              <span>Project slug</span>
              <input
                placeholder="my-app"
                value={config.projectSlug}
                onChange={(event) =>
                  setConfig((currentConfig) => ({
                    ...currentConfig,
                    projectSlug: event.target.value.trim().toLowerCase(),
                  }))
                }
              />
            </label>

            <label>
              <span>Remote API base URL</span>
              <input
                placeholder="https://your-api.vercel.app"
                value={config.apiBaseUrl}
                onChange={(event) =>
                  setConfig((currentConfig) => ({
                    ...currentConfig,
                    apiBaseUrl: event.target.value.trim(),
                  }))
                }
              />
            </label>

            <label className="full-width">
              <span>Admin token</span>
              <input
                placeholder="Only needed for project creation"
                type="password"
                value={config.adminToken}
                onChange={(event) =>
                  setConfig((currentConfig) => ({
                    ...currentConfig,
                    adminToken: event.target.value.trim(),
                  }))
                }
              />
            </label>
          </div>

          <form className="create-form" onSubmit={handleProjectCreation}>
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Provisioning</p>
                <h2>Create project + API key</h2>
              </div>
            </div>

            <div className="form-grid create-grid">
              <label>
                <span>Project name</span>
                <input
                  placeholder="Orders service"
                  value={creationState.name}
                  onChange={(event) =>
                    setCreationState((currentState) => ({
                      ...currentState,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Slug</span>
                <input
                  placeholder="orders-service"
                  value={creationState.slug}
                  onChange={(event) =>
                    setCreationState((currentState) => ({
                      ...currentState,
                      slug: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <button className="primary-button" disabled={creationState.submitting} type="submit">
              {creationState.submitting ? 'Creating project...' : 'Create project'}
            </button>

            {creationState.error ? <p className="inline-error">{creationState.error}</p> : null}

            {creationState.apiKey ? (
              <div className="secret-panel">
                <p className="eyebrow">Generated key</p>
                <code>{creationState.apiKey}</code>
                <p>
                  POST events to <code>{creationState.ingestUrl}</code> with the key in the{' '}
                  <code>x-api-key</code> header.
                </p>
              </div>
            ) : null}
          </form>
        </section>

        <section className="stats-grid">
          <article className="panel stat-card">
            <p className="eyebrow">Project</p>
            <h2>{project?.name ?? 'Not connected'}</h2>
            <p>{project ? project.slug : 'Enter your Supabase details and project slug.'}</p>
          </article>

          <article className="panel stat-card">
            <p className="eyebrow">Loaded events</p>
            <h2>{events.length}</h2>
            <p>Most recent {EVENT_LIMIT} events from this project.</p>
          </article>

          <article className="panel stat-card">
            <p className="eyebrow">Visible events</p>
            <h2>{filteredEvents.length}</h2>
            <p>After applying the current search and channel filters.</p>
          </article>

          <article className="panel stat-card">
            <p className="eyebrow">Latest activity</p>
            <h2>{lastEvent ? new Date(lastEvent.occurred_at).toLocaleTimeString() : 'No data'}</h2>
            <p>{lastEvent ? new Date(lastEvent.occurred_at).toLocaleDateString() : 'Waiting for events.'}</p>
          </article>
        </section>

        <section className="panel filter-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Filters</p>
              <h2>Feed controls</h2>
            </div>
            <p className="panel-meta">{loading ? 'Loading…' : 'Realtime updates enabled'}</p>
          </div>

          <div className="filter-row">
            <label className="search-field">
              <span>Search</span>
              <input
                placeholder="Search title, description, tags, or channel"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="channel-field">
              <span>Channel</span>
              <select
                value={selectedChannel}
                onChange={(event) => setSelectedChannel(event.target.value)}
              >
                <option value="all">All channels</option>
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="inline-error">{error}</p> : null}
        </section>

        <ActivityChart events={filteredEvents} />
        <EventFeed events={filteredEvents} />
      </main>
    </div>
  )
}

export default App
