// ** import lib
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@repo/onboarding/client";

// ** import config
import { APP_URLS } from "@/config/urls";

export const authClient = createAuthClient({
  baseURL: APP_URLS.api,
  plugins: [
    organizationClient(),
    adminClient(),
    // Onboarding plugin - redirect handled by RequireOnboarding component, not here
    onboardingClient(),
  ],
});
