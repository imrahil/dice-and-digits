/** Worker base URL, baked in at build time. Empty = local-only build, cloud UI hidden. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
export const cloudEnabled = API_URL !== ''

/** The worker answered with an error status. A network failure is a plain Error. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** The group, backup or live game is not there (any more), as opposed to being unreachable. */
export const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404

/** One JSON call to the worker. `token` goes out as the Bearer credential. */
export async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (init.token) {
    headers.Authorization = `Bearer ${init.token}`
  }

  const res = await fetch(API_URL + path, { ...init, headers })
  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`)
  }

  return body as T
}

/** A link into this app (`route` is the hash route, e.g. `live/ABC234`). */
export const appLink = (route: string) => `${location.href.split('#')[0]}#/${route}`
