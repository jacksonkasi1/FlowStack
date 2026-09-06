import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createAuthClient } from "better-auth/react";
import {
  isOrganizationMode,
  isOnboardingEnabled,
  requiresOrganization,
} from "@repo/config";
import { guardDestination, matchesRoute } from "./decision";

export type EmailVerificationMode = "force_redirect" | "banner" | "none";
export interface GuardProps {
  children: ReactNode;
  // Better Fetch's generic return type also includes its throw:true overload.
  authClient?: { getSession: (...args: any[]) => Promise<any> };
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
const bypass = [
  "/auth",
  "/onboarding",
  "/reset-password",
  "/accept-invitation",
  "/invitation",
];
const verifyBypass = ["/account/verify-email"];
const fallbackClient = createAuthClient();

export function useGuard(
  pathname: string,
  navigate: (path: string) => void,
  {
    authClient = fallbackClient,
    disabled = false,
    bypassRoutes = bypass,
    onboardingPath = "/onboarding",
    createOrgPath = "/onboarding/create-organization",
    stepPathMap,
    onRedirect,
    requireOrganization = requiresOrganization(),
    emailVerificationMode = "force_redirect",
    emailVerificationRedirectPath = "/account/verify-email",
    emailVerificationBypassRoutes = verifyBypass,
  }: GuardProps,
) {
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const excluded =
    disabled || bypassRoutes.some((route) => matchesRoute(pathname, route));
  useEffect(() => {
    let active = true;
    if (excluded) return;
    setCheckedPath(null);
    setFailed(false);
    authClient
      .getSession({
        query: { disableCookieCache: true },
        fetchOptions: { cache: "no-store" },
      })
      .then((result) => {
        if (!active) return;
        if (result.error) throw new Error("Session check failed");
        const destination = guardDestination(result.data, {
          pathname,
          organization: isOrganizationMode(),
          onboarding: isOnboardingEnabled(),
          requireOrganization,
          onboardingPath,
          createOrgPath,
          stepPathMap,
          emailVerificationMode,
          emailVerificationRedirectPath,
          emailVerificationBypassRoutes,
        });
        if (destination && destination !== pathname) {
          onRedirect?.(destination);
          navigate(destination);
        } else setCheckedPath(pathname);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [
    pathname,
    excluded,
    authClient,
    requireOrganization,
    onboardingPath,
    createOrgPath,
    stepPathMap,
    emailVerificationMode,
    emailVerificationRedirectPath,
    emailVerificationBypassRoutes,
    onRedirect,
    navigate,
    attempt,
  ]);
  return {
    pending: !excluded && checkedPath !== pathname,
    failed: !excluded && failed,
    retry: () => setAttempt((value) => value + 1),
  };
}

export function GuardStatus({
  failed,
  retry,
}: {
  failed: boolean;
  retry: () => void;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center gap-4 p-4"
      role="status"
    >
      {failed ? (
        <>
          <p>Unable to verify your session.</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
