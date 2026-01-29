/**
 * @repo/auth-ui
 *
 * Framework-specific authentication guard components.
 *
 * ## Usage
 *
 * Import guards from the path matching your router framework:
 *
 * ### React Router DOM
 * ```tsx
 * import {
 *   RequireOnboarding,
 *   ProtectedRoute,
 *   EmailVerificationBanner
 * } from "@repo/auth-ui/guards/react-router";
 * ```
 *
 * ### TanStack Router
 * ```tsx
 * import {
 *   RequireOnboarding,
 *   ProtectedRoute
 * } from "@repo/auth-ui/guards/tanstack-router";
 * ```
 *
 * ## Features
 * - **No Provider Required**: Guards work standalone
 * - **Framework-Specific**: Native hooks for each router
 * - **Zero Config**: Sensible defaults, but fully customizable
 */

// ** Types - kept minimal for consumers who need them
export type { AuthUIConfig, OnboardingConfig, AuthConfig } from "./types";

// ** Config utilities
export { DEFAULT_CONFIG, defaultStepPathTransform } from "./config/defaults";
