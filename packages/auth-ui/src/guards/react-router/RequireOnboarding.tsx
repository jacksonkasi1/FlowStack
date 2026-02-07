/**
 * RequireOnboarding Guard (React Router DOM version)
 *
 * Redirects users to onboarding if they haven't completed it.
 * All paths are configurable - no hardcoded values.
 *
 * @example Basic usage
 * ```tsx
 * import { authClient } from "@/lib/auth-client";
 *
 * <RequireOnboarding authClient={authClient}>
 *   <Dashboard />
 * </RequireOnboarding>
 * ```
 *
 * @example Full control
 * ```tsx
 * <RequireOnboarding
 *   authClient={authClient}
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
type AuthSessionClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSession: (...args: any[]) => Promise<any>;
};

export type EmailVerificationMode = "force_redirect" | "banner" | "none";

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
  ],
  requireOrganization: true,
  emailVerificationMode: "force_redirect" as EmailVerificationMode,
  emailVerificationRedirectPath: "/account/verify-email",
  emailVerificationBypassRoutes: ["/account/verify-email"],
};

interface RequireOnboardingProps {
  children: ReactNode;

  // === Optional ===
  /**
   * Better Auth client instance with organization and onboarding plugins
   * If not provided, will create a default client
   */
  authClient?: AuthSessionClient;

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
  bypassRoutes?: readonly string[];

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

  /**
   * Email verification behavior for protected app pages.
   * - "force_redirect": Block unverified users and redirect to verification page
   * - "banner": Allow access (banner mode is handled by EmailVerificationBanner)
   * - "none": No verification UX/enforcement
   * @default "force_redirect"
   */
  emailVerificationMode?: EmailVerificationMode;

  /**
   * Verification page path used when mode is "force_redirect"
   * @default "/account/verify-email"
   */
  emailVerificationRedirectPath?: string;

  /**
   * Additional routes allowed for unverified users in "force_redirect" mode.
   * @default ["/account/verify-email"]
   */
  emailVerificationBypassRoutes?: readonly string[];
}

/**
 * Default loading component
 */
function DefaultLoadingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {/*<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />*/}
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Convert camelCase step name to kebab-case path segment
 */
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
    setIsRedirecting(true);
    onRedirect?.(path);
    navigate(path, { replace: true });
  };

  useEffect(() => {
    const currentPath = location.pathname;

    // Skip check if on bypass route
    const shouldBypass = bypassRoutes.some((route) =>
      currentPath.startsWith(route),
    );

    if (shouldBypass) {
      setIsChecking(false);
      setIsRedirecting(false); // Reset redirect state when on bypass route
      return;
    }

    const checkStatus = async () => {
      // Reset stale redirect state for the current path check.
      // If a redirect is needed in this run, redirectTo() will set it back to true.
      setIsRedirecting(false);

      try {
        // Use provided client or create a fallback
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
        // This prevents redirecting signed-out users into onboarding flows.
        if (!user) {
          return;
        }

        // Check 1: User explicitly needs onboarding
        if (user?.shouldOnboard) {
          const currentStep =
            user.currentOnboardingStep || "createOrganization";
          redirectTo(getStepPath(currentStep));
          return;
        }

        // Check 2: No active organization AND requireOrganization is enabled
        if (requireOrganization && !session?.activeOrganizationId) {
          redirectTo(createOrgPath);
          return;
        }

        // Check 3: Email verification gating (after onboarding + organization checks)
        if (emailVerificationMode === "force_redirect" && !user?.emailVerified) {
          const verificationBypassRoutes = [
            emailVerificationRedirectPath,
            ...emailVerificationBypassRoutes,
          ];
          const canAccessUnverifiedRoute = verificationBypassRoutes.some((route) =>
            currentPath.startsWith(route),
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
    location.pathname,
    emailVerificationMode,
    emailVerificationRedirectPath,
    emailVerificationBypassRoutes,
  ]);

  if (isChecking || isRedirecting) {
    return <>{loadingComponent ?? <DefaultLoadingComponent />}</>;
  }

  return <>{children}</>;
}
