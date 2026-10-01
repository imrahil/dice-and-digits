// The cloud sync tests run the real worker in-process (see src/lib/cloud.test.ts).
// It is plain JS, so give its modules loose types here.
declare module '*/worker/src/worker.js' {
  const worker: { fetch(request: Request, env: unknown): Promise<Response> }

  export default worker
  export const LIMITS: Record<string, number>
  export const Room: unknown
}
declare module '*.mjs'
