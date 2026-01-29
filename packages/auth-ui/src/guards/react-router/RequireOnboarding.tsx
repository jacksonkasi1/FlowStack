/**
 * RequireOnboarding Guard (React Router DOM version)
 *
 * Redirects users to onboarding if they haven't completed it.
 * All paths are configurable - no hardcoded values.
 *
 * @example Zero-config usage
 * ```tsx
 * <RequireOnboarding>
 *   <Dashboard />
 * </RequireOnboarding>
 * ```
 *
 * @example Full control
 * ```tsx
 * <RequireOnboarding
 *   onboardingPath="/setup"
 *   createOrgPath="/setup/org"
 *   stepPathMap={{ inviteMembers: "/setup/invite" }}
 * >
 *   <Dashboard />
 * </RequireOnboarding>
 * ```
 */

// ** import lib
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@repo/onboarding/client";

// ** import types
import type { ReactNode } from "react";

/**
 * Default configuration values
 */
const DEFAULTS = {
    onboardingPath: "/onboarding",
    createOrgPath: "/onboarding/create-organization",
    bypassRoutes: ["/auth", "/onboarding", "/reset-password"],
    requireOrganization: true,
};

interface RequireOnboardingProps {
    children: ReactNode;

    // === Control ===
    /**
     * Completely disable the guard
     * @default false
     */
    disabled?: boolean;

    /**
     * Routes that bypass onboarding check
     * @default ["/auth", "/onboarding", "/reset-password"]
     */
    bypassRoutes?: string[];

    // === Paths (all configurable) ===
    /**
     * Base path for onboarding pages
     * @default "/onboarding"
     */
    onboardingPath?: string;

    /**
     * Path for organization creation step
     * @default "/onboarding/create-organization"
     */
    createOrgPath?: string;

    /**
     * Custom mapping of step names to paths.
     * Keys are step names (e.g., "createOrganization", "inviteMembers")
     * Values are full paths (e.g., "/setup/org")
     */
    stepPathMap?: Record<string, string>;

    // === Callbacks ===
    /**
     * Called before redirect with the target path
     */
    onRedirect?: (path: string) => void;

    // === UI ===
    /**
     * Custom loading component
     */
    loadingComponent?: ReactNode;

    // === Behavior ===
    /**
     * Require user to have an active organization
     * @default true
     */
    requireOrganization?: boolean;
}

/**
 * Default loading component
 */
function DefaultLoadingComponent() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        </div>
    );
}

/**
 * Convert camelCase step name to kebab-case path segment
 */
function stepToPath(step: string): string {
    return step.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
}

export function RequireOnboarding({
    children,
    disabled = false,
    bypassRoutes = DEFAULTS.bypassRoutes,
    onboardingPath = DEFAULTS.onboardingPath,
    createOrgPath = DEFAULTS.createOrgPath,
    stepPathMap,
    onRedirect,
    loadingComponent,
    requireOrganization = DEFAULTS.requireOrganization,
}: RequireOnboardingProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const [isChecking, setIsChecking] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    // If disabled, render children directly
    if (disabled) {
        return <>{children}</>;
    }

    /**
     * Get the path for a given onboarding step
     */
    const getStepPath = (stepName: string): string => {
        // Check custom mapping first
        if (stepPathMap?.[stepName]) {
            return stepPathMap[stepName];
        }
        // Fall back to base path + kebab-case step name
        return `${onboardingPath}/${stepToPath(stepName)}`;
    };

    /**
     * Navigate to a path, calling onRedirect callback if provided
     */
    const redirectTo = (path: string) => {
        onRedirect?.(path);
        navigate(path, { replace: true });
    };

    useEffect(() => {
        const currentPath = location.pathname;

        // Skip check if on bypass route
        const shouldBypass = bypassRoutes.some((route) =>
            currentPath.startsWith(route)
        );

        if (shouldBypass) {
            setIsChecking(false);
            return;
        }

        const checkStatus = async () => {
            try {
                const authClient = createAuthClient({
                    plugins: [organizationClient(), adminClient(), onboardingClient()],
                });

                const result = await authClient.getSession({
                    fetchOptions: { cache: "no-store" },
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const session = result.data?.session as any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const user = result.data?.user as any;

                // Check 1: User explicitly needs onboarding
                if (user?.shouldOnboard) {
                    setNeedsOnboarding(true);
                    const currentStep = user.currentOnboardingStep || "createOrganization";
                    redirectTo(getStepPath(currentStep));
                    return;
                }

                // Check 2: No active organization AND requireOrganization is enabled
                if (requireOrganization && !session?.activeOrganizationId) {
                    setNeedsOnboarding(true);
                    redirectTo(createOrgPath);
                    return;
                }
            } catch (error) {
                console.error("Failed to check onboarding status:", error);
            } finally {
                setIsChecking(false);
            }
        };

        checkStatus();
    }, [navigate, location.pathname, requireOrganization, bypassRoutes, onboardingPath, createOrgPath, stepPathMap]);

    if (isChecking) {
        return <>{loadingComponent ?? <DefaultLoadingComponent />}</>;
    }

    if (needsOnboarding) {
        return null;
    }

    return <>{children}</>;
}
