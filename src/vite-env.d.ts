/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Cloudflare Worker base URL (no trailing slash). Empty/unset = local-only, cloud features hidden. */
  readonly VITE_API_URL?: string
}
