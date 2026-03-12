const CORS_HEADERS = {
  'Access-Control-Allow-Headers':
    'authorization, content-type, x-admin-token, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
} as const

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  })
}

export function emptyResponse(status = 204) {
  return new Response(null, {
    status,
    headers: CORS_HEADERS,
  })
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, { status })
}

export function methodNotAllowed(allow: string) {
  return jsonResponse(
    { error: `Method not allowed. Use ${allow}.` },
    {
      status: 405,
      headers: { Allow: allow },
    },
  )
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization')

  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return null
  }

  return authorization.slice(7).trim()
}
