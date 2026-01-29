/**
 * React Router DOM Guards
 *
 * Standalone guards for React Router DOM applications.
 * No provider needed - just import and use.
 *
 * @example
 * ```tsx
 * import { RequireOnboarding, ProtectedRoute } from "@repo/auth-ui/guards/react-router";
 *
 * <RequireOnboarding>
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * </RequireOnboarding>
 * ```
 */

export { RequireOnboarding } from "./RequireOnboarding";
export { ProtectedRoute } from "./ProtectedRoute";
export { EmailVerificationBanner } from "./EmailVerificationBanner";
