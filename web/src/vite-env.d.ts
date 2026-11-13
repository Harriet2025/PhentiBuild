/// <reference types="vite/client" />

// Tells TypeScript which VITE_ environment variables exist and their types,
// so a typo like import.meta.env.VITE_API_BASEURL is caught at build time.
interface ImportMetaEnv {
  readonly VITE_BACKEND?: 'django' | 'php'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_CLASSIC_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
