// ** import lib
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@better-auth-extended/onboarding/client";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    adminClient(),
    // Use without type parameter - type inference doesn't work across packages
    onboardingClient({
      onOnboardingRedirect: () => {
        window.location.href = "/onboarding";
      },
    }) as any, // Type workaround
  ],
});
