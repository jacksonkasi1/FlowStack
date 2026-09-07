# Email Verification Policy

> **Level:** 🟡 Intermediate | **Time:** ⏱️ 10 min | **Prerequisites:** [Protected Routes](./protected-routes.md), [Onboarding](./onboarding.md)

Control what happens when a user has:

- created an account
- completed onboarding
- **not verified email**
- tries to open protected app pages

---

## Modes

Use one of these modes:

1. `force_redirect` (default): block protected pages and send user to verification page.
2. `banner`: allow access, show top verification strip.
3. `none`: no verification UX/enforcement.

---

## Web Config

Create one central config file:

`apps/web/src/config/email-verification.ts`

```ts
import type { EmailVerificationMode } from "@repo/auth-ui/guards/react-router";

export const EMAIL_VERIFICATION_CONFIG = {
  mode: "force_redirect" as EmailVerificationMode,
  redirectPath: "/account/verify-email",
  bypassRoutes: ["/account/verify-email"],
  bannerMessage: "Verify your email to unlock full access.",
} as const;
```

---

## Route Guard Wiring

Pass config into `RequireOnboarding` for protected routes:

```tsx
<RequireOnboarding
  authClient={authClient}
  emailVerificationMode={EMAIL_VERIFICATION_CONFIG.mode}
  emailVerificationRedirectPath={EMAIL_VERIFICATION_CONFIG.redirectPath}
  emailVerificationBypassRoutes={EMAIL_VERIFICATION_CONFIG.bypassRoutes}
>
  <Dashboard />
</RequireOnboarding>
```

This runs **after onboarding + organization checks**, so signup/onboarding flow is not affected.

---

## Banner Mode Wiring

Show the top-strip only in banner mode:

```tsx
<EmailVerificationBanner
  mode={EMAIL_VERIFICATION_CONFIG.mode}
  message={EMAIL_VERIFICATION_CONFIG.bannerMessage}
  authClient={authClient}
/>
```

---

## Verification Page

When using `force_redirect`, add a page (example path):

- `/account/verify-email`

The page should let user:

1. resend verification email
2. re-check verification status
3. continue to app once verified

---

## Custom App Logic Hook

For fully custom behavior/UI, use:

```tsx
import { useEmailVerificationStatus } from "@repo/auth-ui/guards/react-router";
```

Returns:

- `user`
- `isVerified`
- `isPending`
- `refetch()`

