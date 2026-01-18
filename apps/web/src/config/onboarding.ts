/**
 * Onboarding Configuration
 * 
 * Controls whether users are required to complete onboarding before accessing the app.
 */

export const ONBOARDING_CONFIG = {
    /**
     * Enable/disable onboarding requirement
     * Set to false to allow users to skip onboarding
     */
    enabled: true,

    /**
     * Redirect path for onboarding
     */
    onboardingPath: "/onboarding",

    /**
     * Routes that should bypass onboarding check
     * Users can access these even without completing onboarding
     */
    bypassRoutes: [
        "/onboarding",
        "/auth/*",
        "/reset-password",
        "/invitation/*",
    ],
} as const;
