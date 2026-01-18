/**
 * Authentication redirect configuration
 *
 * Frontend only needs the default login redirect path
 */
export const AUTH_REDIRECTS = {
    /**
     * Default redirect path after successful login/signup
     */
    afterLogin: "/dashboard",

    /**
     * Onboarding page path
     */
    onboarding: "/onboarding",
} as const;
