/**
 * @repo/auth-ui Configuration Defaults
 *
 * Default values for auth-ui configuration.
 * These can be overridden via AuthUIProvider config prop.
 */

// ** import types
import type { AuthUIConfig } from "../types";

/**
 * Default step path transformer
 * Converts camelCase to kebab-case
 * e.g., "createOrganization" -> "create-organization"
 */
export const defaultStepPathTransform = (step: string): string =>
    step.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");

/**
 * Default auth-ui configuration
 */
export const DEFAULT_CONFIG: Required<AuthUIConfig> = {
    auth: {
        bypassRoutes: [
            "/auth",
            "/onboarding",
            "/reset-password",
            "/invitation",
            "/accept-invitation",
        ],
        redirects: {
            afterLogin: "/dashboard",
            afterLogout: "/auth/sign-in",
            afterEmailVerification: "/dashboard",
            signIn: "/auth/sign-in",
            onboarding: "/onboarding",
            organizationInvitation: "/accept-invitation",
        },
        organization: {
            requireOrganization: true,
        },
    },
    onboarding: {
        enabled: true,
        firstStep: "createOrganization",
        stepPathTransform: defaultStepPathTransform,
    },
};

/**
 * Merge user config with defaults (deep merge)
 */
export function mergeConfig(userConfig?: AuthUIConfig): Required<AuthUIConfig> {
    if (!userConfig) return DEFAULT_CONFIG;

    return {
        auth: {
            bypassRoutes: userConfig.auth?.bypassRoutes ?? DEFAULT_CONFIG.auth.bypassRoutes,
            redirects: {
                ...DEFAULT_CONFIG.auth.redirects,
                ...userConfig.auth?.redirects,
            },
            organization: {
                ...DEFAULT_CONFIG.auth.organization,
                ...userConfig.auth?.organization,
            },
        },
        onboarding: {
            enabled: userConfig.onboarding?.enabled ?? DEFAULT_CONFIG.onboarding.enabled,
            firstStep: userConfig.onboarding?.firstStep ?? DEFAULT_CONFIG.onboarding.firstStep,
            stepPathTransform:
                userConfig.onboarding?.stepPathTransform ?? DEFAULT_CONFIG.onboarding.stepPathTransform,
        },
    };
}
