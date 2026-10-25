// The maintained source exercises both account models; setup chooses the app mode.
export const TEMPLATE_MODE: "personal" | "organization" = "organization";

/** Optional integrations selected during setup. Core auth and database are always on. */
export const TEMPLATE_FEATURES = {
  email: true,
  storage: true,
  googleAuth: true,
} as const;
