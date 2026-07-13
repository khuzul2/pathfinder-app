// Registers @testing-library/jest-dom matchers for component (*.test.tsx, jsdom) tests.
// Safe to load in node-env tests too — it only extends `expect`, touching no DOM at import.
import '@testing-library/jest-dom/vitest';

// jsdom implements neither ResizeObserver (needed by Vaul/Recharts) — stub it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom has no matchMedia; provide a light-mode default. Individual tests may override
// window.matchMedia to simulate a dark OS preference.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
