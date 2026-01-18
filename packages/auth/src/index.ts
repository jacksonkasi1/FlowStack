// ** import types
export type { AuthSession, AuthUser } from "./auth";
export type { Env, Bindings, AuthConfig } from "./types";
export type { MemberRole } from "./config/roles";

// ** import config
export {
    MEMBER_ROLES,
    MEMBER_ROLE_ORDER,
    MEMBER_ROLE_LABELS,
    MEMBER_ROLE_DESCRIPTIONS,
    DEFAULT_MEMBER_ROLE,
    CREATOR_ROLE,
    isAdminOrAbove,
    canManageMembers,
    compareRoles,
} from "./config/roles";

// ** import utils
export { configureAuth } from "./auth";
export type { auth } from "./auth";
export { createEnvFromProcess } from "./types";
export { sendResetPassword } from "./email/send-reset-password";
export { sendVerificationEmail } from "./email/send-verification-email";
export { sendOrganizationInvitation } from "./email/send-invitation";
export { default as checkUserRole } from "./utils/user-is-admin";
