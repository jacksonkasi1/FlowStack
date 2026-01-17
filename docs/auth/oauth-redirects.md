# OAuth Redirects

How to configure redirects after social login (Google, GitHub, etc.).

## The Problem

After OAuth login, Better Auth redirects to the **backend** by default, not your frontend.

## Solution

### 1. Set Frontend URL in AuthUIProvider

Set `baseURL` in `AuthUIProvider` to your **frontend** URL:

```tsx
// apps/web/src/providers.tsx
<AuthUIProvider
  authClient={authClient}
  baseURL={window.location.origin}  // ← Frontend URL, NOT backend
  navigate={navigate}
  // ...
>
```

### 2. Use Centralized Redirect Config

All redirect paths are configured in `config/redirects.ts`:

```ts
// apps/web/src/config/redirects.ts
export const AUTH_REDIRECTS = {
  afterLogin: "/dashboard",
  afterEmailVerification: "/dashboard",
  afterPasswordReset: "/auth/sign-in",
  afterMagicLink: "/dashboard",
  organizationInvitation: "/accept-invitation",
} as const;
```

Use it in your auth pages:

```tsx
import { AUTH_REDIRECTS } from "@/config/redirects";

const redirectTo = AUTH_REDIRECTS.afterLogin;
```

## Key Points

| Setting | Value | Example |
|---------|-------|---------|
| `baseURL` in AuthUIProvider | Frontend URL | `http://localhost:5173` |
| `baseURL` in authClient | Backend API URL | `http://localhost:8080` |
| `redirectTo` prop | Use config | `AUTH_REDIRECTS.afterLogin` |

## Files to Modify

### Backend
- `packages/auth/src/config/redirects.ts` - Define redirect paths

### Frontend
- `apps/web/src/config/redirects.ts` - Define redirect paths
- `apps/web/src/providers.tsx` - Add `baseURL` prop
- `apps/web/src/pages/auth/AuthPage.tsx` - Use `AUTH_REDIRECTS`

## Common Mistakes

❌ **Wrong**: Hardcoding redirect paths
```tsx
const redirectTo = "/dashboard";
```

✅ **Correct**: Using centralized config
```tsx
import { AUTH_REDIRECTS } from "@/config/redirects";
const redirectTo = AUTH_REDIRECTS.afterLogin;
```

## References

- [Better Auth OAuth Docs](https://www.better-auth.com/docs/concepts/oauth)
- [Social Providers Options](https://www.better-auth.com/docs/reference/options#socialproviders)
