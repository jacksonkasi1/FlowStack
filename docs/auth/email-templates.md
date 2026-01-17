# Email Templates

Customize verification, password reset, and magic link emails.

## Email Functions

Located in `packages/auth/src/email/`:

| File | Purpose |
|------|---------|
| `send-verification-email.ts` | Email verification |
| `send-reset-password.ts` | Password reset |
| `send-magic-link.ts` | Magic link login |
| `send-invitation.ts` | Org invitations |

---

## Configuration in `auth.ts`

### Verification Email

```ts
emailVerification: {
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
  sendVerificationEmail: async ({ user, url }) => {
    const verificationUrl = buildEmailUrlWithFrontendCallback(url, "/dashboard");
    await sendVerificationEmail(env, {
      to: { address: user.email, name: user.name || "" },
      url: verificationUrl,
    });
  },
},
```

### Password Reset

```ts
emailAndPassword: {
  sendResetPassword: async ({ user, url }) => {
    const resetUrl = buildPasswordResetFrontendUrl(url);
    await sendResetPassword(env, {
      to: { address: user.email, name: user.name || "" },
      url: resetUrl,
    });
  },
},
```

---

## URL Building Helpers

### Frontend Callback URL

```ts
const buildEmailUrlWithFrontendCallback = (
  originalUrl: string,
  frontendPath: string = "/dashboard"
): string => {
  const urlObj = new URL(originalUrl);
  urlObj.searchParams.set("callbackURL", `${frontendURL}${frontendPath}`);
  return urlObj.toString();
};
```

### Password Reset URL

```ts
const buildPasswordResetFrontendUrl = (originalUrl: string): string => {
  const urlObj = new URL(originalUrl);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  const token = pathParts[pathParts.length - 1];
  return `${frontendURL}/reset-password?token=${token}`;
};
```

---

## Environment Variables

```env
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=FlowStack
```

## References

- [Better Auth Email Verification](https://www.better-auth.com/docs/concepts/email-verification)
- [Password Reset](https://www.better-auth.com/docs/authentication/email-password#password-reset)
