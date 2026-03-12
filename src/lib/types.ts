export type EventRecord = {
  channel: string
  created_at: string
  description: string | null
  icon: string | null
  id: string
  occurred_at: string
  project_id: string
  tags: string[]
  title: string
}

export type ProjectRecord = {
  created_at: string
  id: string
  name: string
  slug: string
}

export type CreateProjectResponse = {
  apiKey: string
  ingestUrl: string
  project: ProjectRecord
}
