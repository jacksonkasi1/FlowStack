// ** import lib
import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

// ** import components
import { RequireOnboarding } from "@/components/auth/RequireOnboarding";

// ** import pages
import AuthPage from "@/pages/auth/AuthPage";
import ResetPassword from "@/pages/auth/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import OrganizationSettingsPage from "@/pages/organization/Settings";
import OrganizationMembersPage from "@/pages/organization/Members";
import AcceptInvitationPage from "@/pages/organization/AcceptInvite";

export default function App() {
  return (
    <RequireOnboarding>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SignedIn>
                <Navigate to="/dashboard" replace />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth/sign-in" replace />
              </SignedOut>
            </>
          }
        />
        <Route path="/auth/:pathname" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/create-organization" element={<Onboarding step="createOrganization" />} />
        <Route path="/onboarding/invite-members" element={<Onboarding step="inviteMembers" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account/settings" element={<Settings />} />
        <Route
          path="/organization/settings"
          element={<OrganizationSettingsPage />}
        />
        <Route
          path="/organization/members"
          element={<OrganizationMembersPage />}
        />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      </Routes>
    </RequireOnboarding>
  );
}
