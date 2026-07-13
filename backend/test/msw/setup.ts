import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './server';
import { resetCaptured } from './handlers';

/**
 * Registers the hermetic upstream mock lifecycle for a test file. Any request to a real
 * external host that lacks a handler is flagged (print.error); supertest's own localhost
 * traffic to the in-process app is allowed through.
 */
export function useMockUpstreams(): void {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest(request, print) {
        const { hostname } = new URL(request.url);
        if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
          return;
        }
        print.error();
      },
    });
  });
  afterEach(() => {
    server.resetHandlers();
    resetCaptured();
  });
  afterAll(() => server.close());
}
