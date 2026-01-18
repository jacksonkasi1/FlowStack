// ** import lib
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";

// ** import utils
import { authClient } from "@/lib/auth-client";

// ** import config
import { ORGANIZATION_CONFIG } from "@/config/organization";

interface RequireOnboardingProps {
    children: React.ReactNode;
}

/**
 * Guard component that checks if user needs onboarding
 * Redirects to onboarding page if:
 * - User has shouldOnboard = true
 * - User has no active organization AND requireOrganization is enabled
 */
export function RequireOnboarding({ children }: RequireOnboardingProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    // Routes that bypass onboarding check
    const bypassRoutes = [
        "/auth",
        "/onboarding",
        "/reset-password",
        "/invitation",
        "/accept-invitation",
    ];

    useEffect(() => {
        // Skip check if on bypass route
        const currentPath = location.pathname;
        const shouldBypass = bypassRoutes.some((route) =>
            currentPath.startsWith(route)
        );

        if (shouldBypass) {
            setIsChecking(false);
            return;
        }

        // Check onboarding status via session
        const checkStatus = async () => {
            try {
                // Force fresh fetch to get updated session data
                const result = await authClient.getSession({
                    fetchOptions: { cache: "no-store" },
                });
                const session = result.data?.session as any;
                const user = result.data?.user as any;

                // Check 1: User explicitly needs onboarding
                if (user?.shouldOnboard) {
                    setNeedsOnboarding(true);

                    // Build redirect path from currentOnboardingStep
                    const currentStep = user.currentOnboardingStep || "createOrganization";
                    const stepPath = `/onboarding/${currentStep.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "")}`;

                    navigate({ to: stepPath, replace: true });
                    return;
                }

                // Check 2: User has no active organization AND requireOrganization is enabled
                // This handles the edge case where user was removed from all organizations
                if (ORGANIZATION_CONFIG.requireOrganization && !session?.activeOrganizationId) {
                    // Force onboarding - user has no organization access
                    setNeedsOnboarding(true);
                    navigate({ to: "/onboarding/create-organization", replace: true });
                    return;
                }
            } catch (error) {
                console.error("Failed to check onboarding status:", error);
            } finally {
                setIsChecking(false);
            }
        };

        checkStatus();
    }, [navigate, location.pathname]);

    // Show loading state while checking
    if (isChecking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render children if redirecting to onboarding
    if (needsOnboarding) {
        return null;
    }

    return <>{children}</>;
}
