/**
 * Organization Configuration
 *
 * ⚙️ USER-CONFIGURABLE: Modify these settings to customize organization behavior.
 *
 * Used by:
 * - @repo/auth (backend organization plugin)
 * - apps/web (AuthUIProvider organization settings)
 * - apps/tanstack (AuthUIProvider organization settings)
 *
 * Organization Roles:
 * - Default roles (owner, admin, member) are managed by better-auth
 * - No custom roles configuration needed
 */

/**
 * Organization logo upload settings
 */
export interface OrganizationLogoConfig {
    /** Image dimensions in pixels (used for both width and height) */
    size: number;
    /** Allowed file extensions */
    extensions: string[];
}

/**
 * ⚙️ USER-CONFIGURABLE: Organization Logo Settings
 *
 * Configure the organization logo upload behavior.
 */
export const ORGANIZATION_LOGO: OrganizationLogoConfig = {
    size: 256,
    extensions: ["png", "jpg", "jpeg", "webp"],
};

/**
 * ⚙️ USER-CONFIGURABLE: Organization Roles
 *
 * Define the roles available in organizations.
 * These are the roles that members can be assigned.
 *
 * Default better-auth roles:
 * - "owner" - Full control, can delete organization
 * - "admin" - Full control except deleting org or changing owner
 * - "member" - Limited control, can read data
 *
 * You can customize which roles are shown/used by editing this array.
 * The first role in the array is typically the default for new members.
 */
export const ORGANIZATION_ROLES = ["admin", "member"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
