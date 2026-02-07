// ** import types
import type { EmailVerificationMode } from "@repo/auth-ui";

/**
 * Email verification behavior for protected app routes.
 * Change mode to "banner" or "none" without touching guards/pages.
 */
export const EMAIL_VERIFICATION_CONFIG = {
  mode: "force_redirect" as EmailVerificationMode,
  redirectPath: "/account/verify-email",
  bypassRoutes: ["/account/verify-email"],
  bannerMessage: "Verify your email to unlock full access.",
} as const;

