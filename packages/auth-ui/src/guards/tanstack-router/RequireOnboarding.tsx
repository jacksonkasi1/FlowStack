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
import type { EmailVerificationMode } from "../../types";

type AuthSessionClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSession: (...args: any[]) => Promise<any>;
};

/**
 * Default configuration values
 */
const DEFAULTS = {
  onboardingPath: "/onboarding",
  createOrgPath: "/onboarding/create-organization",
  bypassRoutes: [
    "/auth",
    "/onboarding",
    "/reset-password",
    "/accept-invitation",
    "/invitation",
  ],
  requireOrganization: true,
  emailVerificationMode: "force_redirect" as EmailVerificationMode,
  emailVerificationRedirectPath: "/account/verify-email",
  emailVerificationBypassRoutes: ["/account/verify-email"],
};

interface RequireOnboardingProps {
  children: ReactNode;
  authClient?: AuthSessionClient;
  disabled?: boolean;
  bypassRoutes?: readonly string[];
  onboardingPath?: string;
  createOrgPath?: string;
  stepPathMap?: Record<string, string>;
  onRedirect?: (path: string) => void;
  loadingComponent?: ReactNode;
  requireOrganization?: boolean;
  emailVerificationMode?: EmailVerificationMode;
  emailVerificationRedirectPath?: string;
  emailVerificationBypassRoutes?: readonly string[];
}

function DefaultLoadingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

function stepToPath(step: string): string {
  return step
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

export function RequireOnboarding({
  children,
  authClient,
  disabled = false,
  bypassRoutes = DEFAULTS.bypassRoutes,
  onboardingPath = DEFAULTS.onboardingPath,
  createOrgPath = DEFAULTS.createOrgPath,
  stepPathMap,
  onRedirect,
  loadingComponent,
  requireOrganization = DEFAULTS.requireOrganization,
  emailVerificationMode = DEFAULTS.emailVerificationMode,
  emailVerificationRedirectPath = DEFAULTS.emailVerificationRedirectPath,
  emailVerificationBypassRoutes = DEFAULTS.emailVerificationBypassRoutes,
}: RequireOnboardingProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isChecking, setIsChecking] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
    setIsRedirecting(true);
    onRedirect?.(path);
    navigate({ to: path, replace: true });
  };

  useEffect(() => {
    const currentPath = location.pathname;
    const shouldBypass = bypassRoutes.some((route) =>
      currentPath.startsWith(route),
    );

    if (shouldBypass) {
      setIsChecking(false);
      setIsRedirecting(false);
      return;
    }

    const checkStatus = async () => {
      // Clear stale redirect state for the new check.
      setIsRedirecting(false);
      try {
        const client =
          authClient ||
          createAuthClient({
            plugins: [
              organizationClient(),
              adminClient() as any,
              onboardingClient(),
            ],
          });

        const result = await client.getSession({
          fetchOptions: { cache: "no-store" },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = result.data?.session as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = result.data?.user as any;

        // Let auth-specific guards handle unauthenticated users.
        if (!user) {
          return;
        }

        if (user?.shouldOnboard) {
          const currentStep =
            user.currentOnboardingStep || "createOrganization";
          redirectTo(getStepPath(currentStep));
          return;
        }

        if (requireOrganization && !session?.activeOrganizationId) {
          redirectTo(createOrgPath);
          return;
        }

        // Email verification gating (after onboarding + organization checks)
        if (
          emailVerificationMode === "force_redirect" &&
          !user?.emailVerified
        ) {
          const verificationBypassRoutes = [
            emailVerificationRedirectPath,
            ...emailVerificationBypassRoutes,
          ];
          const canAccessUnverifiedRoute = verificationBypassRoutes.some(
            (route) => currentPath.startsWith(route),
          );

          if (!canAccessUnverifiedRoute) {
            redirectTo(emailVerificationRedirectPath);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [
    authClient,
    navigate,
    location.pathname,
    requireOrganization,
    bypassRoutes,
    onboardingPath,
    createOrgPath,
    stepPathMap,
    emailVerificationMode,
    emailVerificationRedirectPath,
    emailVerificationBypassRoutes,
  ]);

  if (isChecking || isRedirecting) {
    return <>{loadingComponent ?? <DefaultLoadingComponent />}</>;
  }

  return <>{children}</>;
}
