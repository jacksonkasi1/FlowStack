// ** import lib
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ** import config
import { ONBOARDING_CONFIG } from "@/config/onboarding";

// ** import rest-api
import { checkOnboardingStatus } from "@/rest-api/onboarding";

interface RequireOnboardingProps {
    children: React.ReactNode;
}

/**
 * Guard component that checks if user needs onboarding
 * Redirects to onboarding page if incomplete
 */
export function RequireOnboarding({ children }: RequireOnboardingProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        // Skip check if onboarding is disabled
        if (!ONBOARDING_CONFIG.enabled) {
            setIsChecking(false);
            return;
        }

        // Skip check if on bypass route
        const currentPath = location.pathname;
        const shouldBypass = ONBOARDING_CONFIG.bypassRoutes.some((route) => {
            if (route.endsWith("/*")) {
                return currentPath.startsWith(route.slice(0, -2));
            }
            return currentPath === route;
        });

        if (shouldBypass) {
            setIsChecking(false);
            return;
        }

        // Check onboarding status via API
        const checkStatus = async () => {
            try {
                const { shouldOnboard } = await checkOnboardingStatus();
                if (shouldOnboard) {
                    setNeedsOnboarding(true);
                    navigate(ONBOARDING_CONFIG.onboardingPath);
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
