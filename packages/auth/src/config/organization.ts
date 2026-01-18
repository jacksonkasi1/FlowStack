/**
 * Organization Configuration
 *
 * Controls organization-related behavior and requirements
 */

/**
 * Organization settings for the auth system
 */
export const ORGANIZATION_CONFIG = {
    /**
     * If true, users MUST belong to an organization to use the product.
     * Users without an organization will be redirected to onboarding to create one.
     *
     * If false, users can access the product without an organization.
     *
     * @default true
     */
    requireOrganization: true,
} as const;

export type OrganizationConfig = typeof ORGANIZATION_CONFIG;
