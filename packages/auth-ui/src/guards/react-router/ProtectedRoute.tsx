/**
 * ProtectedRoute Guard (React Router DOM version)
 *
 * Requires user to be signed in.
 * All paths are configurable.
 *
 * @example Zero-config usage
 * ```tsx
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 *
 * @example Custom sign-in path
 * ```tsx
 * <ProtectedRoute signInPath="/login">
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 */

// ** import lib
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Navigate } from "react-router-dom";

// ** import types
import type { ReactNode } from "react";

/**
 * Default configuration values
 */
const DEFAULTS = {
    signInPath: "/auth/sign-in",
};

interface ProtectedRouteProps {
    children: ReactNode;

    /**
     * Path to redirect to when not signed in
     * @default "/auth/sign-in"
     */
    signInPath?: string;

    /**
     * Called when user is not authenticated (before redirect)
     */
    onUnauthenticated?: () => void;
}

export function ProtectedRoute({
    children,
    signInPath = DEFAULTS.signInPath,
    onUnauthenticated,
}: ProtectedRouteProps) {
    return (
        <>
            <SignedOut>
                <RedirectHandler onUnauthenticated={onUnauthenticated} signInPath={signInPath} />
            </SignedOut>

            <SignedIn>{children}</SignedIn>
        </>
    );
}

function RedirectHandler({ onUnauthenticated, signInPath }: { onUnauthenticated?: () => void; signInPath: string }) {
    onUnauthenticated?.();
    return <Navigate to={signInPath} replace />;
}
