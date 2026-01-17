/**
 * Authentication redirect configuration
 *
 * Backend redirect paths used in email/magic link flows
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
     * Redirect path after magic link login
     */
    afterMagicLink: "/dashboard",

    /**
     * Base path for organization invitation acceptance
     */
    organizationInvitation: "/accept-invitation",
} as const;
