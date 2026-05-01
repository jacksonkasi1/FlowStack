// ** import core packages
import { createAuthClient } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";

// ** import types
import type { BetterAuthClientPlugin } from "better-auth/client";

type BaseClient = ReturnType<
  typeof createAuthClient<{ plugins: BetterAuthClientPlugin[] }>
>;

export function createClient(baseURL: string): BaseClient {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient(), adminClient()],
  }) as unknown as BaseClient;
}

export type AuthClient = ReturnType<typeof createClient>;
