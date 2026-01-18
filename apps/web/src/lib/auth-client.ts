// ** import lib
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@better-auth-extended/onboarding/client";

// ** import config
import { APP_URLS } from "@/config/urls";
import { AUTH_REDIRECTS } from "@/config/redirects";

export const authClient = createAuthClient({
  baseURL: APP_URLS.api,
  plugins: [
    organizationClient(),
    adminClient(),
    // Note: Using 'as any' workaround for type compatibility
    onboardingClient({
      onOnboardingRedirect: () => {
        window.location.href = AUTH_REDIRECTS.onboarding;
      },
    }) as any,
  ],
});
