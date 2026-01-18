/**
 * Onboarding Configuration
 *
 * Controls whether users are required to complete onboarding before accessing the app.
 */

// ** import config
import { AUTH_REDIRECTS } from "@/config/redirects";

export const ONBOARDING_CONFIG = {
    /**
     * Enable/disable onboarding requirement
     * Set to false to allow users to skip onboarding
     */
    enabled: true,

    /**
     * Redirect path for onboarding (from centralized config)
     */
    onboardingPath: AUTH_REDIRECTS.onboarding,

    /**
     * Routes that should bypass onboarding check
     * Users can access these even without completing onboarding
     */
    bypassRoutes: [
        AUTH_REDIRECTS.onboarding,
        "/auth/*",
        "/reset-password",
        "/invitation/*",
    ],
} as const;
