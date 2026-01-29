/**
 * RequireOnboarding Guard (TanStack Router version)
 *
 * Redirects users to onboarding if they haven't completed it.
 * All paths are configurable - no hardcoded values.
 *
 * @example Zero-config usage
 * ```tsx
 * <RequireOnboarding>
 *   <Outlet />
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
 *   <Outlet />
 * </RequireOnboarding>
 * ```
 */

// ** import lib
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
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
    disabled?: boolean;
    bypassRoutes?: string[];
    onboardingPath?: string;
    createOrgPath?: string;
    stepPathMap?: Record<string, string>;
    onRedirect?: (path: string) => void;
    loadingComponent?: ReactNode;
    requireOrganization?: boolean;
}

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

    if (disabled) {
        return <>{children}</>;
    }

    const getStepPath = (stepName: string): string => {
        if (stepPathMap?.[stepName]) {
            return stepPathMap[stepName];
        }
        return `${onboardingPath}/${stepToPath(stepName)}`;
    };

    const redirectTo = (path: string) => {
        onRedirect?.(path);
        navigate({ to: path, replace: true });
    };

    useEffect(() => {
        const currentPath = location.pathname;
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

                if (user?.shouldOnboard) {
                    setNeedsOnboarding(true);
                    const currentStep = user.currentOnboardingStep || "createOrganization";
                    redirectTo(getStepPath(currentStep));
                    return;
                }

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
