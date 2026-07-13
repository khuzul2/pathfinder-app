/** Minimal in-memory TTL cache for proxied upstream responses (single-instance dev/MVP). */
interface Entry {
  value: unknown;
  expires: number;
}

export class TtlCache {
  private store = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  get(key: string): unknown | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    this.store.set(key, { value, expires: this.now() + ttlMs });
  }
}
