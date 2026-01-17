/**
 * Authentication redirect configuration
 *
 * Centralized place to define where users are redirected after auth actions
 */
export const AUTH_REDIRECTS = {
    /**
     * Default redirect path after successful login/signup
     */
    afterLogin: "/dashboard",

    /**
     * Redirect path after email verification
     */
    afterEmailVerification: "/dashboard",

    /**
     * Redirect path after password reset (usually back to sign-in)
     */
    afterPasswordReset: "/auth/sign-in",

    /**
     * Redirect path after magic link login
     */
    afterMagicLink: "/dashboard",

    /**
     * Base path for organization invitation acceptance
     */
    organizationInvitation: "/accept-invitation",
} as const;
