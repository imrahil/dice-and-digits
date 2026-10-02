/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Cloudflare Worker base URL (no trailing slash). Empty/unset = local-only, cloud features hidden. */
  readonly VITE_API_URL?: string
}

/** `version` from package.json, injected by Vite at build time. */
declare const __APP_VERSION__: string
/** ISO timestamp of the build. */
declare const __BUILD_DATE__: string
