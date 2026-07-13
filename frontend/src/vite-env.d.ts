/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mapbox public token — the ONLY credential allowed in the client bundle. */
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
