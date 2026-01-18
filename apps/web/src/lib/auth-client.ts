// ** import lib
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@better-auth-extended/onboarding/client";
import type { auth } from "@repo/auth";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    adminClient(),
    onboardingClient<typeof auth>({
      onOnboardingRedirect: () => {
        window.location.href = "/onboarding";
      },
    }),
  ],
});
