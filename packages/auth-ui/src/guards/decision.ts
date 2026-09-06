export function matchesRoute(path: string, route: string) {
  return path === route || path.startsWith(`${route.replace(/\/$/, "")}/`);
}

export interface GuardSession {
  user?: {
    emailVerified?: boolean;
    shouldOnboard?: boolean;
    currentOnboardingStep?: string | null;
  };
  session?: { activeOrganizationId?: string | null };
}

export function guardDestination(
  data: GuardSession | null | undefined,
  options: {
    pathname: string;
    organization: boolean;
    onboarding: boolean;
    requireOrganization: boolean;
    onboardingPath: string;
    createOrgPath: string;
    stepPathMap?: Record<string, string>;
    emailVerificationMode: string;
    emailVerificationRedirectPath: string;
    emailVerificationBypassRoutes: readonly string[];
  },
): string | null {
  if (!data?.user) return "/auth/sign-in";
  if (options.organization && options.onboarding && data.user.shouldOnboard) {
    const step = data.user.currentOnboardingStep || "createOrganization";
    return (
      options.stepPathMap?.[step] ||
      `${options.onboardingPath}/${step
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase()
        .replace(/^-/, "")}`
    );
  }
  if (
    options.organization &&
    options.requireOrganization &&
    !data.session?.activeOrganizationId
  )
    return options.createOrgPath;
  if (
    options.emailVerificationMode === "force_redirect" &&
    !data.user.emailVerified &&
    ![
      options.emailVerificationRedirectPath,
      ...options.emailVerificationBypassRoutes,
    ].some((route) => matchesRoute(options.pathname, route))
  ) {
    return options.emailVerificationRedirectPath;
  }
  return null;
}
