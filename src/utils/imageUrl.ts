/**
 * Resolves image URLs for display in the mobile app.
 *
 * - MinIO URLs: Convert to backend proxy URL ({API_URL}/storage/{path}) so images load
 *   reliably regardless of network (avoids CORS, unreachable MinIO from device).
 * - Relative URLs (/path): Prepend EXPO_PUBLIC_API_URL for API-proxied images.
 * - data: URIs: Return as-is (caller may choose to handle or show placeholder).
 */
const MINIO_BUCKET = 'aaro360-images'

function isMinioUrl(url: string): boolean {
  return url.includes('https://027e9d60504f67c1cace1792d7fd5175.r2.cloudflarestorage.com') || url.includes(MINIO_BUCKET)
}

function toProxyUrl(url: string): string | null {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || ''
  if (!apiUrl) return null

  try {
    const parsed = new URL(url)
    const pathPart = parsed.pathname + parsed.search
    if (!pathPart.startsWith('/')) return null

    const base = apiUrl.replace(/\/$/, '')
    return `${base}/storage${pathPart}`
  } catch {
    return null
  }
}

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()
  if (!trimmed) return null

  // data: URIs - return as-is (caller handles)
  if (trimmed.startsWith('data:')) return trimmed

  // Relative URL - prepend API base URL
  if (trimmed.startsWith('/')) {
    const base = process.env.EXPO_PUBLIC_API_URL || ''
    if (!base) return trimmed
    return base.replace(/\/$/, '') + trimmed
  }

  // Full URL - convert MinIO URLs to proxy
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (isMinioUrl(trimmed)) {
      const proxyUrl = toProxyUrl(trimmed)
      return proxyUrl ?? trimmed
    }
    return trimmed
  }

  return trimmed
}
