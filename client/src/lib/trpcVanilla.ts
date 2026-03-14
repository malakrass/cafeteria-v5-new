/**
 * Vanilla TRPC client for use outside React components
 * (e.g., simulation engines, test tools, utility functions)
 *
 * Use this client in async functions that are NOT React hooks.
 * For React components, use the `trpc` hook from `./trpc` instead.
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

export const trpcVanilla = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});
