// ** import lib
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const authClient = createAuthClient({
  baseURL,
  plugins: [organizationClient(), adminClient()],
});
