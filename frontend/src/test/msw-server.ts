import { setupServer } from "msw/node";

/**
 * Shared MSW node server for component tests. Individual tests register
 * request handlers with `server.use(...)`; `src/test/setup.ts` wires the
 * standard listen/reset/close lifecycle.
 */
export const server = setupServer();
