/**
 * Organization Configuration
 *
 * Controls organization-related behavior and requirements
 */

/**
 * Organization settings for the auth system
 */
// ** import config
import { requiresOrganization } from "@repo/config";

export const ORGANIZATION_CONFIG = {
    /**
     * If true, users MUST belong to an organization to use the product.
     * Calculated from centralized AUTH_MODE_CONFIG.
     */
    requireOrganization: requiresOrganization(),
} as const;

export type OrganizationConfig = typeof ORGANIZATION_CONFIG;
