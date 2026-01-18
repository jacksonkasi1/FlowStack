// ** import lib
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

// ** import config
import { APP_URLS } from "@/config/urls";

export const authClient = createAuthClient({
  baseURL: APP_URLS.api,
  plugins: [
    organizationClient(),
    adminClient(),
    // Note: Not using onboardingClient auto-redirect
    // RequireOnboarding component handles redirect via React Router
  ],
});
