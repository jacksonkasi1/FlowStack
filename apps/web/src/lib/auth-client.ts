// ** import lib
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: ReturnType<typeof createAuthClient<{ plugins: any[] }>> =
  createAuthClient({
    baseURL,
    plugins: [organizationClient(), adminClient()],
  // Zod v4 internal types cannot be named portably — cast at module boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
