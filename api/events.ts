import { emptyResponse, errorResponse, getBearerToken, jsonResponse, methodNotAllowed } from './_lib/http'
import { sha256Hex } from './_lib/security'
import { getAdminClient } from './_lib/supabase'

export const config = {
  runtime: 'edge',
}

type EventPayload = {
  channel?: unknown
  description?: unknown
  icon?: unknown
  occurredAt?: unknown
  tags?: unknown
  title?: unknown
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  return trimmed.slice(0, maxLength)
}

function normalizeTags(value: unknown) {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    return null
  }

  const tags = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  return Array.from(new Set(tags)).slice(0, 12)
}

function normalizeOccurredAt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return new Date().toISOString()
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.valueOf())) {
    return null
  }

  return parsed.toISOString()
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return emptyResponse()
  }

  if (request.method !== 'POST') {
    return methodNotAllowed('POST, OPTIONS')
  }

  const apiKey = request.headers.get('x-api-key') ?? getBearerToken(request)

  if (!apiKey) {
    return errorResponse('Missing API key. Use x-api-key or Authorization: Bearer <key>.', 401)
  }

  const payload = (await request.json().catch(() => null)) as EventPayload | null

  if (!payload) {
    return errorResponse('Request body must be valid JSON.', 400)
  }

  const channel = normalizeText(payload.channel, 48)
  const title = normalizeText(payload.title, 140)
  const description = normalizeText(payload.description, 800)
  const icon = normalizeText(payload.icon, 8)
  const tags = normalizeTags(payload.tags)
  const occurredAt = normalizeOccurredAt(payload.occurredAt)

  if (!channel) {
    return errorResponse('channel is required.', 400)
  }

  if (!title) {
    return errorResponse('title is required.', 400)
  }

  if (!tags) {
    return errorResponse('tags must be an array of strings.', 400)
  }

  if (!occurredAt) {
    return errorResponse('occurredAt must be a valid ISO-8601 timestamp.', 400)
  }

  try {
    const supabase = getAdminClient()
    const apiKeyHash = await sha256Hex(apiKey)

    const { data: keyRecord, error: keyError } = await supabase
      .from('project_api_keys')
      .select('project_id')
      .eq('key_hash', apiKeyHash)
      .maybeSingle()

    if (keyError) {
      throw keyError
    }

    if (!keyRecord) {
      return errorResponse('Invalid API key.', 401)
    }

    const { data: event, error: insertError } = await supabase
      .from('events')
      .insert({
        channel,
        description,
        icon,
        occurred_at: occurredAt,
        project_id: keyRecord.project_id,
        tags,
        title,
      })
      .select(
        'id, project_id, channel, title, description, icon, tags, occurred_at, created_at',
      )
      .single()

    if (insertError) {
      throw insertError
    }

    return jsonResponse({ event }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected API error.'
    return errorResponse(message, 500)
  }
}
