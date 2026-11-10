/**
 * JSON in localStorage, under the app's prefix. Neither call throws: a phone
 * with storage full or blocked (private mode) keeps working in memory.
 * The inline script in index.html reads `dice-digits:settings` directly.
 */

export const STORAGE_PREFIX = 'dice-digits:'

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)

    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Stores `value`; null or undefined removes the key. */
export function writeJson(key: string, value: unknown) {
  try {
    if (value == null) {
      localStorage.removeItem(STORAGE_PREFIX + key)
    } else {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    }
  } catch {
    // Quota exceeded or storage disabled: keep working in memory.
  }
}
