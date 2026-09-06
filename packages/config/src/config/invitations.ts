const env = {
  ...(typeof process !== "undefined" ? process.env : {}),
  ...(import.meta as ImportMeta & { env?: Record<string, string> }).env,
};

/** Set the same VITE_* values in the server and frontend .env files. */
export const INVITATION_CONFIG = {
  directSignup: env.VITE_INVITE_DIRECT_SIGNUP !== "false",
  lockEmail: env.VITE_INVITE_LOCK_EMAIL !== "false",
  skipOrganizationOnboarding:
    env.VITE_INVITE_SKIP_ORGANIZATION_ONBOARDING !== "false",
};

export const MULTI_ORGANIZATION_CONFIG = {
  enabled: env.VITE_ALLOW_MULTIPLE_ORGANIZATIONS === "true",
};
