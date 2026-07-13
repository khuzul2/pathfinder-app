/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mapbox public token — the ONLY credential allowed in the client bundle. */
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  /** '1' enables public demo mode: call upstreams directly instead of the backend proxy. */
  readonly VITE_DEMO?: string;
  /** ORS key for demo-mode direct routing (embedded in the public bundle by design). */
  readonly VITE_ORS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
