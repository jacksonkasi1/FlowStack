# OAuth Redirects

> **Level:** 🟡 Intermediate | **Time:** ⏱️ 10 min | **Prerequisites:** [Configuration](./configuration.md)

How to configure redirects after social login (Google, GitHub, etc.).

---

## What You'll Learn

- ✅ Fix OAuth redirect issues
- ✅ Configure frontend URL for callbacks
- ✅ Use centralized redirect configuration

---

## The Problem

After OAuth login, Better Auth redirects to the **backend** by default, not your frontend.

## Solution

### 1. Configure Frontend URL

Create centralized URL config in `config/urls.ts`:

```ts
// apps/web/src/config/urls.ts
export const APP_URLS = {
  frontend: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
  api: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
} as const;
```

### 2. Set Frontend URL in AuthUIProvider

Use the config in your providers:

```tsx
// apps/web/src/providers.tsx
import { APP_URLS } from "@/config/urls";

<AuthUIProvider
  authClient={authClient}
  baseURL={APP_URLS.frontend}  // ← Frontend URL for OAuth callbacks
  navigate={navigate}
  // ...
>
```

### 3. Use Centralized Redirect Config

All redirect paths are configured in `config/redirects.ts`:

```ts
// apps/web/src/config/redirects.ts
export const AUTH_REDIRECTS = {
  afterLogin: "/dashboard",
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
| `APP_URLS.frontend` | Frontend URL | `http://localhost:5173` |
| `APP_URLS.api` | Backend API URL | `http://localhost:8080` |
| `baseURL` in AuthUIProvider | Use `APP_URLS.frontend` | For OAuth callbacks |
| `redirectTo` prop | Use `AUTH_REDIRECTS` | `AUTH_REDIRECTS.afterLogin` |

## Environment Variables

```env
# Frontend URL (for OAuth callbacks)
VITE_FRONTEND_URL=http://localhost:5173

# Backend API URL
VITE_API_BASE_URL=http://localhost:8080
```

## Files to Modify

### Configuration Files
- `apps/web/src/config/urls.ts` - Define frontend/API URLs
- `apps/web/src/config/redirects.ts` - Define redirect paths

### Backend
- `packages/auth/src/config/redirects.ts` - Define redirect paths

### Frontend
- `apps/web/src/providers.tsx` - Use `APP_URLS.frontend` for `baseURL`
- `apps/web/src/pages/auth/AuthPage.tsx` - Use `AUTH_REDIRECTS`

## Common Mistakes

❌ **Wrong**: Hardcoding URLs
```tsx
const frontendBaseURL = window.location.origin;
const redirectTo = "/dashboard";
```

✅ **Correct**: Using centralized configs
```tsx
import { APP_URLS } from "@/config/urls";
import { AUTH_REDIRECTS } from "@/config/redirects";

<AuthUIProvider baseURL={APP_URLS.frontend} />
const redirectTo = AUTH_REDIRECTS.afterLogin;
```

## References

- [Better Auth OAuth Docs](https://www.better-auth.com/docs/concepts/oauth)
- [Social Providers Options](https://www.better-auth.com/docs/reference/options#socialproviders)
