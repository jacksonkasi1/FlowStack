// ** import lib
import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

// ** import components
import { RequireOnboarding } from "@repo/auth-ui/guards/react-router";
import { isOrganizationMode } from "@repo/config";

// ** import pages
import AuthPage from "@/pages/auth/AuthPage";
import ResetPassword from "@/pages/auth/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import VerifyEmailPage from "@/pages/account/VerifyEmail";
import OrganizationSettingsPage from "@/pages/organization/Settings";
import OrganizationMembersPage from "@/pages/organization/Members";
import AcceptInvitationPage from "@/pages/organization/AcceptInvite";

// ** import utils
import { authClient } from "@/lib/auth-client";
import { EMAIL_VERIFICATION_CONFIG } from "@/config/email-verification";
import { FullPageLoading } from "@/components/ui/full-page-loading";

export default function App() {
  const guardProps = {
    authClient,
    emailVerificationMode: EMAIL_VERIFICATION_CONFIG.mode,
    emailVerificationRedirectPath: EMAIL_VERIFICATION_CONFIG.redirectPath,
    emailVerificationBypassRoutes: EMAIL_VERIFICATION_CONFIG.bypassRoutes,
    loadingComponent: <FullPageLoading />,
  } as const;

  return (
    <Routes>
      {/* Auth routes - no guard needed */}
      <Route path="/auth" element={<Navigate to="/auth/sign-in" replace />} />
      <Route path="/auth/:pathname" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Onboarding routes - no guard needed, they handle their own auth */}
      {isOrganizationMode() && (
        <>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/onboarding/create-organization"
            element={<Onboarding step="createOrganization" />}
          />
          <Route
            path="/onboarding/invite-members"
            element={<Onboarding step="inviteMembers" />}
          />
          <Route
            path="/accept-invitation"
            element={<AcceptInvitationPage />}
          />
        </>
      )}

      {/* Protected routes - wrapped with RequireOnboarding */}
      <Route
        path="/"
        element={
          <RequireOnboarding {...guardProps}>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <Navigate to="/auth/sign-in" replace />
            </SignedOut>
          </RequireOnboarding>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireOnboarding {...guardProps}>
            <Dashboard />
          </RequireOnboarding>
        }
      />
      <Route
        path="/account/settings"
        element={
          <RequireOnboarding {...guardProps}>
            <Settings />
          </RequireOnboarding>
        }
      />
      <Route
        path={EMAIL_VERIFICATION_CONFIG.redirectPath}
        element={
          <RequireOnboarding {...guardProps}>
            <VerifyEmailPage />
          </RequireOnboarding>
        }
      />

      {/* Organization routes - protected */}
      {isOrganizationMode() && (
        <>
          <Route
            path="/organization/settings"
            element={
              <RequireOnboarding {...guardProps}>
                <OrganizationSettingsPage />
              </RequireOnboarding>
            }
          />
          <Route
            path="/organization/members"
            element={
              <RequireOnboarding {...guardProps}>
                <OrganizationMembersPage />
              </RequireOnboarding>
            }
          />
        </>
      )}
    </Routes>
  );
}
