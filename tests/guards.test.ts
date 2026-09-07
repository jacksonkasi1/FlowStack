import { expect, test } from "bun:test";
import {
  guardDestination,
  matchesRoute,
} from "../packages/auth-ui/src/guards/decision";
const options = {
  pathname: "/dashboard",
  organization: true,
  onboarding: true,
  requireOrganization: true,
  onboardingPath: "/onboarding",
  createOrgPath: "/onboarding/create-organization",
  emailVerificationMode: "force_redirect",
  emailVerificationRedirectPath: "/account/verify-email",
  emailVerificationBypassRoutes: [],
};
test("personal users bypass organization state but still require authentication and verification", () => {
  const personal = { ...options, organization: false, onboarding: false };
  expect(guardDestination(null, personal)).toBe("/auth/sign-in");
  expect(
    guardDestination(
      { user: { shouldOnboard: true, emailVerified: false } },
      personal,
    ),
  ).toBe("/account/verify-email");
  expect(
    guardDestination(
      { user: { shouldOnboard: true, emailVerified: true } },
      personal,
    ),
  ).toBeNull();
});
test("organization onboarding completes without redirecting back", () => {
  expect(guardDestination({ user: { shouldOnboard: true } }, options)).toBe(
    "/onboarding/create-organization",
  );
  expect(
    guardDestination(
      {
        user: { shouldOnboard: true, currentOnboardingStep: "inviteMembers" },
        session: { activeOrganizationId: "org" },
      },
      options,
    ),
  ).toBe("/onboarding/invite-members");
  expect(
    guardDestination(
      {
        user: { shouldOnboard: false, emailVerified: true },
        session: { activeOrganizationId: "org" },
      },
      options,
    ),
  ).toBeNull();
});
test("route bypasses match segments, not lookalike prefixes", () => {
  expect(matchesRoute("/auth/sign-in", "/auth")).toBe(true);
  expect(matchesRoute("/authentication-private", "/auth")).toBe(false);
});
