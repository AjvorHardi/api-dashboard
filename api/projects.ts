import { getApiEnv } from './_lib/env'
import { emptyResponse, errorResponse, jsonResponse, methodNotAllowed } from './_lib/http'
import { createApiKey, createSlug, keyPrefix, sha256Hex } from './_lib/security'
import { getAdminClient } from './_lib/supabase'

export const config = {
  runtime: 'edge',
}

type CreateProjectPayload = {
  name?: unknown
  slug?: unknown
}

function normalizeName(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 80) : null
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return emptyResponse()
  }

  if (request.method !== 'POST') {
    return methodNotAllowed('POST, OPTIONS')
  }

  try {
    const env = getApiEnv()
    const adminToken = request.headers.get('x-admin-token')

    if (!adminToken || adminToken !== env.adminToken) {
      return errorResponse('Invalid admin token.', 401)
    }

    const payload = (await request.json().catch(() => null)) as CreateProjectPayload | null

    if (!payload) {
      return errorResponse('Request body must be valid JSON.', 400)
    }

    const name = normalizeName(payload.name)

    if (!name) {
      return errorResponse('name is required.', 400)
    }

    const slug = createSlug(typeof payload.slug === 'string' ? payload.slug : name)

    if (!slug) {
      return errorResponse('slug must include letters or numbers.', 400)
    }

    const apiKey = createApiKey()
    const apiKeyHash = await sha256Hex(apiKey)
    const supabase = getAdminClient()

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, slug })
      .select('id, name, slug, created_at')
      .single()

    if (projectError) {
      if (projectError.code === '23505') {
        return errorResponse(`Project slug "${slug}" already exists.`, 409)
      }

      throw projectError
    }

    const { error: keyError } = await supabase.from('project_api_keys').insert({
      key_hash: apiKeyHash,
      key_prefix: keyPrefix(apiKey),
      label: 'default',
      project_id: project.id,
    })

    if (keyError) {
      throw keyError
    }

    const origin = env.appUrl ?? new URL(request.url).origin

    return jsonResponse(
      {
        apiKey,
        ingestUrl: `${origin}/api/events`,
        project,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected API error.'
    return errorResponse(message, 500)
  }
}
