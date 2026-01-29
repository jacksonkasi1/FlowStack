/**
 * Auth Mode Configuration
 *
 * ⚙️ USER-CONFIGURABLE: Change these settings to switch between auth modes.
 *
 * This is the SINGLE source of truth for authentication mode configuration.
 * Both frontend and backend read from this file.
 *
 * @example Switch to simple auth (no organizations):
 * ```ts
 * mode: "simple"
 * ```
 *
 * @example Switch to organization mode (default):
 * ```ts
 * mode: "organization"
 * ```
 */

// ** import types
export type AuthMode = "simple" | "organization";

/**
 * Auth Mode Configuration
 *
 * Controls how FlowStack handles user authentication and onboarding.
 */
export interface AuthModeConfig {
    /**
     * Auth mode determines the user signup experience:
     *
     * - `"simple"`: User signs up → goes directly to dashboard
     *   Best for: Personal apps, single-user SaaS, MVPs
     *
     * - `"organization"`: User signs up → creates org → invites team → dashboard
     *   Best for: Team SaaS, B2B apps, multi-tenant systems
     *
     * @default "organization"
     */
    mode: AuthMode;

    /**
     * If mode is "organization", is org membership REQUIRED to access the app?
     *
     * - `true`: User MUST create/join an org to access dashboard
     * - `false`: Org features available but optional (user can skip)
     *
     * Only applies when mode is "organization".
     *
     * @default true
     */
    requireOrganization: boolean;

    /**
     * Enable the onboarding flow after signup?
     *
     * In "simple" mode, this is typically false.
     * In "organization" mode, this guides users through org setup.
     *
     * @default true (in organization mode)
     */
    enableOnboarding: boolean;
}

/**
 * ⚙️ USER-CONFIGURABLE: Auth Mode Settings
 *
 * Change this configuration to switch between auth modes.
 * See docs/auth/auth-modes.md for detailed documentation.
 *
 * @example Simple auth (no organizations):
 * ```ts
 * export const AUTH_MODE_CONFIG: AuthModeConfig = {
 *   mode: "simple",
 *   requireOrganization: false,
 *   enableOnboarding: false,
 * };
 * ```
 */
export const AUTH_MODE_CONFIG: AuthModeConfig = {
    mode: "organization",
    requireOrganization: true,
    enableOnboarding: true,
};

// ============================================================================
// Helper Functions - Use these in your code instead of reading config directly
// ============================================================================

/**
 * Check if auth mode is "simple" (no organizations)
 */
export const isSimpleMode = (): boolean => AUTH_MODE_CONFIG.mode === "simple";

/**
 * Check if auth mode is "organization"
 */
export const isOrganizationMode = (): boolean => AUTH_MODE_CONFIG.mode === "organization";

/**
 * Check if organization membership is required
 * Returns false in simple mode, respects config in organization mode
 */
export const requiresOrganization = (): boolean =>
    isOrganizationMode() && AUTH_MODE_CONFIG.requireOrganization;

/**
 * Check if onboarding is enabled
 */
export const isOnboardingEnabled = (): boolean =>
    isOrganizationMode() && AUTH_MODE_CONFIG.enableOnboarding;
