interface ImportMetaEnv {
  /** Backend URL. Defaults to http://localhost:8000. */
  readonly VITE_API_BASE_URL?: string
  /** "false" turns the mock API off and calls the real backend. */
  readonly VITE_API_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
