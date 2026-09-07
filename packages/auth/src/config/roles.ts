/**
 * Organization Member Roles Configuration
 *
 * Centralized role definitions for organization membership.
 * Use these constants throughout the codebase for consistency.
 *
 * @example
 * ```ts
 * import { MEMBER_ROLES, MemberRole } from '@repo/auth';
 *
 * // Use role values
 * await db.insert(memberTable).values({
 *   role: MEMBER_ROLES.owner,  // "owner"
 * });
 *
 * // Type-safe role parameter
 * function setRole(role: MemberRole) { ... }
 * ```
 */

/**
 * Available member roles in order of decreasing permissions
 */
export const MEMBER_ROLES = {
    /** Full control over organization - can delete org, manage billing */
    owner: "owner",
    /** Administrative access - can manage members, settings */
    admin: "admin",
    /** Standard member - read/write access to resources */
    member: "member",
} as const;

/**
 * Ordered list of roles (highest to lowest privilege)
 * Useful for role comparisons and dropdowns
 */
export const MEMBER_ROLE_ORDER = [
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.member,
] as const;

/**
 * Type for member role values
 */
export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES];

/**
 * Default role for new members (via invitation)
 */
export const DEFAULT_MEMBER_ROLE = MEMBER_ROLES.member;

/**
 * Default role for organization creator
 */
export const CREATOR_ROLE = MEMBER_ROLES.owner;

/**
 * Role labels for UI display
 */
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
    [MEMBER_ROLES.owner]: "Owner",
    [MEMBER_ROLES.admin]: "Admin",
    [MEMBER_ROLES.member]: "Member",
};

/**
 * Role descriptions for tooltips/help text
 */
export const MEMBER_ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
    [MEMBER_ROLES.owner]: "Full control over the organization",
    [MEMBER_ROLES.admin]: "Can manage members and settings",
    [MEMBER_ROLES.member]: "Standard access to resources",
};

/**
 * Check if a role has admin-level or higher permissions
 */
export function isAdminOrAbove(role: MemberRole): boolean {
    return role === MEMBER_ROLES.owner || role === MEMBER_ROLES.admin;
}

/**
 * Check if a role can manage other members
 */
export function canManageMembers(role: MemberRole): boolean {
    return isAdminOrAbove(role);
}

/**
 * Compare roles - returns positive if roleA > roleB
 */
export function compareRoles(roleA: MemberRole, roleB: MemberRole): number {
    const indexA = MEMBER_ROLE_ORDER.indexOf(roleA);
    const indexB = MEMBER_ROLE_ORDER.indexOf(roleB);
    return indexB - indexA; // Lower index = higher privilege
}
