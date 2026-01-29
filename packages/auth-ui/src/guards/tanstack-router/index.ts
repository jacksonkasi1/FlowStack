/**
 * TanStack Router Guards
 *
 * Standalone guards for TanStack Router applications.
 * No provider needed - just import and use.
 *
 * @example
 * ```tsx
 * import { RequireOnboarding, ProtectedRoute } from "@repo/auth-ui/guards/tanstack-router";
 *
 * <RequireOnboarding>
 *   <ProtectedRoute>
 *     <Outlet />
 *   </ProtectedRoute>
 * </RequireOnboarding>
 * ```
 */

export { RequireOnboarding } from "./RequireOnboarding";
export { ProtectedRoute } from "./ProtectedRoute";
