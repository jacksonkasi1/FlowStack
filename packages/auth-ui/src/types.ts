/**
 * @repo/auth-ui Types
 *
 * Core type definitions for the auth-ui package.
 * These types define the configuration surface area for developers.
 */

// ** import types
import type { ReactNode } from "react";

/**
 * Router adapter interface - abstracts router-specific navigation
 *
 * Implement this interface for different routing libraries:
 * - react-router-dom
 * - @tanstack/react-router
 * - next/navigation
 */
export interface RouterAdapter {
    /**
     * Get current pathname
     */
    usePathname: () => string;

    /**
     * Navigate to a path
     */
    useNavigate: () => (to: string, options?: { replace?: boolean }) => void;
}

/**
 * Auth configuration - controls authentication behavior
 */
export interface AuthConfig {
    /**
     * Routes that bypass all auth guards
     * @default ["/auth", "/onboarding", "/reset-password", "/invitation", "/accept-invitation"]
     */
    bypassRoutes?: string[];

    /**
     * Redirect paths for different auth states
     */
    redirects?: {
        /** Redirect path after successful login */
        afterLogin?: string;
        /** Redirect path after logout */
        afterLogout?: string;
        /** Redirect path after email verification */
        afterEmailVerification?: string;
        /** Sign-in page path */
        signIn?: string;
        /** Onboarding base path */
        onboarding?: string;
        /** Organization invitation path */
        organizationInvitation?: string;
    };

    /**
     * Organization requirements
     */
    organization?: {
        /**
         * If true, users must belong to an organization
         * @default true
         */
        requireOrganization?: boolean;
    };
}

/**
 * Onboarding feature configuration
 */
export interface OnboardingConfig {
    /**
     * Enable/disable onboarding entirely
     * When disabled, RequireOnboarding guard becomes a passthrough
     * @default true
     */
    enabled?: boolean;

    /**
     * First step to redirect users to
     * @default "createOrganization"
     */
    firstStep?: string;

    /**
     * Custom step path transformer
     * Converts step ID to URL path (e.g., "createOrganization" -> "/onboarding/create-organization")
     */
    stepPathTransform?: (step: string) => string;
}

/**
 * Full auth-ui configuration
 */
export interface AuthUIConfig {
    /**
     * Auth configuration
     */
    auth?: AuthConfig;

    /**
     * Onboarding configuration
     */
    onboarding?: OnboardingConfig;
}

/**
 * AuthUIProvider props
 */
export interface AuthUIProviderProps {
    /**
     * Router adapter for navigation
     * Use reactRouterAdapter or tanstackRouterAdapter
     */
    routerAdapter: RouterAdapter;

    /**
     * Configuration overrides
     */
    config?: AuthUIConfig;

    /**
     * Children components
     */
    children: ReactNode;
}

/**
 * RequireOnboarding component props
 */
export interface RequireOnboardingProps {
    /**
     * Children to render when not redirecting
     */
    children: ReactNode;

    /**
     * Disable the guard (renders children directly)
     */
    disabled?: boolean;

    /**
     * Additional bypass routes (merged with provider config)
     */
    bypassRoutes?: string[];

    /**
     * Custom loading component
     */
    loadingComponent?: ReactNode;
}

/**
 * ProtectedRoute component props
 */
export interface ProtectedRouteProps {
    /**
     * Children to render when authenticated
     */
    children: ReactNode;

    /**
     * Custom redirect path for unauthenticated users
     */
    redirectTo?: string;
}

/**
 * Auth client factory options
 */
export interface CreateAuthClientOptions {
    /**
     * Base URL for API requests
     */
    baseURL: string;

    /**
     * Enable onboarding plugin
     * @default true
     */
    enableOnboarding?: boolean;

    /**
     * Enable organization plugin
     * @default true
     */
    enableOrganization?: boolean;

    /**
     * Enable admin plugin
     * @default true
     */
    enableAdmin?: boolean;
}
