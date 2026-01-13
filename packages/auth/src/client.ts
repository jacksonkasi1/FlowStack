// ** import core packages
import { createAuthClient } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";

export function createClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient(), adminClient()],
  });
}

export type AuthClient = ReturnType<typeof createClient>;
