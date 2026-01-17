// ** import lib
import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

// ** import pages
import AuthPage from "@/pages/auth/AuthPage";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import OrganizationSettingsPage from "@/pages/organization/Settings";
import OrganizationMembersPage from "@/pages/organization/Members";
import AcceptInvitationPage from "@/pages/organization/AcceptInvite";

export default function App() {
  return (
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
      <Route path="/invitation/:id" element={<AcceptInvitationPage />} />
    </Routes>
  );
}
