const textEncoder = new TextEncoder()

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToBase64Url(bytes: Uint8Array) {
  const chunked = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(chunked)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value))
  return bytesToHex(new Uint8Array(digest))
}

export function createApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return `evt_${bytesToBase64Url(bytes)}`
}

export function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function keyPrefix(key: string) {
  return key.slice(0, 12)
}
