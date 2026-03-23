/**
 * Resolves image URLs for display in the mobile app.
 *
 * Images are now served directly from Cloudflare R2 public CDN.
 * No backend proxy is needed — all public URLs (https://pub-*.r2.dev/...)
 * are returned as-is and loaded directly by expo-image.
 *
 * IMPORTANT: All R2 images are stored as WebP. This function transforms
 * .jpeg/.jpg/.png extensions to .webp for R2 URLs to fix legacy database records.
 */

const R2_DOMAIN = 'r2.dev';

function isR2Url(url: string): boolean {
  return url.includes(R2_DOMAIN);
}

function fixWebpExtension(url: string): string {
  if (!isR2Url(url)) return url;
  return url.replace(/\.(jpeg|jpg|png)$/i, '.webp');
}

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // data: URIs — return as-is (caller handles performance implications)
  if (trimmed.startsWith('data:')) return trimmed;

  // Relative URL — prepend API base URL
  if (trimmed.startsWith('/')) {
    const base = process.env.EXPO_PUBLIC_API_URL ?? '';
    if (!base) return trimmed;
    return base.replace(/\/$/, '') + trimmed;
  }

  // Full URLs (http/https) — fix extension for R2 URLs, then return
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return fixWebpExtension(trimmed);
  }

  return trimmed;
}
