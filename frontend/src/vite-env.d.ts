/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mapbox public token — the ONLY credential allowed in the client bundle. */
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  /** '1' enables the hermetic browser demo mode (MSW worker serves synthetic /api data). */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
