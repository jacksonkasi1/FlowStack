// ** import lib
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Navigate } from "react-router-dom";

// ** import types
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = "/auth/sign-in",
}: ProtectedRouteProps) {
  return (
    <>
      <SignedOut>
        <Navigate to={redirectTo} replace />
      </SignedOut>

      <SignedIn>{children}</SignedIn>
    </>
  );
}
