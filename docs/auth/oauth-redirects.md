# OAuth Redirects

How to configure redirects after social login (Google, GitHub, etc.).

## The Problem

After OAuth login, Better Auth redirects to the **backend** by default, not your frontend.

## Solution

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

## Key Points

| Setting | Value | Example |
|---------|-------|---------|
| `baseURL` in AuthUIProvider | Frontend URL | `http://localhost:5173` |
| `baseURL` in authClient | Backend API URL | `http://localhost:8080` |
| `redirectTo` prop | Relative path | `/dashboard` |

## Files to Modify

- `apps/web/src/providers.tsx` - Add `baseURL` prop
- `apps/tanstack/src/providers.tsx` - Add `baseURL` prop

## Common Mistakes

❌ **Wrong**: Using absolute URL for `redirectTo`
```tsx
const redirectTo = `${window.location.origin}/dashboard`;
```

✅ **Correct**: Using relative path
```tsx
const redirectTo = "/dashboard";
```

## References

- [Better Auth OAuth Docs](https://www.better-auth.com/docs/concepts/oauth)
- [Social Providers Options](https://www.better-auth.com/docs/reference/options#socialproviders)
