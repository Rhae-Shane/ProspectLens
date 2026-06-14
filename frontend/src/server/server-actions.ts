const cookieCache = new Map<string, string>()

function readCookie(key: string): string | undefined {
  if (typeof document === 'undefined') return cookieCache.get(key)
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : cookieCache.get(key)
}

function writeCookie(key: string, value: string, maxAge = 60 * 60 * 24 * 7) {
  cookieCache.set(key, value)
  if (typeof document !== 'undefined') {
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`
  }
}

export async function getValueFromCookie(key: string): Promise<string | undefined> {
  return readCookie(key)
}

export async function setValueToCookie(
  key: string,
  value: string,
  options: { path?: string; maxAge?: number } = {}
): Promise<void> {
  writeCookie(key, value, options.maxAge)
}

export async function getPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T
): Promise<T> {
  const value = readCookie(key)?.trim()
  return value && allowed.includes(value as T) ? (value as T) : fallback
}
