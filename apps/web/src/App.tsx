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
import OrganizationSettingsPage from "@/pages/organization/Settings";
import OrganizationMembersPage from "@/pages/organization/Members";
import AcceptInvitationPage from "@/pages/organization/AcceptInvite";

// ** import utils
import { authClient } from "@/lib/auth-client";

export default function App() {
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
          <RequireOnboarding authClient={authClient}>
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
          <RequireOnboarding authClient={authClient}>
            <Dashboard />
          </RequireOnboarding>
        }
      />
      <Route
        path="/account/settings"
        element={
          <RequireOnboarding authClient={authClient}>
            <Settings />
          </RequireOnboarding>
        }
      />

      {/* Organization routes - protected */}
      {isOrganizationMode() && (
        <>
          <Route
            path="/organization/settings"
            element={
              <RequireOnboarding authClient={authClient}>
                <OrganizationSettingsPage />
              </RequireOnboarding>
            }
          />
          <Route
            path="/organization/members"
            element={
              <RequireOnboarding authClient={authClient}>
                <OrganizationMembersPage />
              </RequireOnboarding>
            }
          />
        </>
      )}
    </Routes>
  );
}
