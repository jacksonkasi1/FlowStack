# Troubleshooting Guide

Common authentication issues and solutions.

## OAuth Redirect Issues

### Problem: Redirects to backend instead of frontend after Google login

**Symptoms:**
- After Google OAuth, redirected to `http://localhost:8080/dashboard`
- Should redirect to `http://localhost:5173/dashboard`

**Solution:**
```tsx
// apps/web/src/providers.tsx
import { APP_URLS } from "@/config/urls";

<AuthUIProvider
  baseURL={APP_URLS.frontend}  // ← Must be frontend URL
  // ...
>
```

**See:** [OAuth Redirects Guide](./oauth-redirects.md)

---

### Problem: Email/password login works, but social login doesn't

**Check:**
1. Is `baseURL` set in `AuthUIProvider`?
2. Is `VITE_FRONTEND_URL` in `.env`?
3. Are OAuth credentials correct in backend `.env`?

---

## CORS Errors

### Problem: CORS errors when calling auth API

**Symptoms:**
```
Access to fetch at 'http://localhost:8080/api/auth/...' from origin 
'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**

Add frontend URL to `ALLOWED_ORIGINS`:

```env
# Backend .env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**See:** [Cross-Domain Auth Guide](./cross-domain-auth.md)

---

## Email Verification Issues

### Problem: Email verification link redirects to backend

**Check:**
```ts
// packages/auth/src/auth.ts
const verificationUrl = buildEmailUrlWithFrontendCallback(
  url,
  AUTH_REDIRECTS.afterEmailVerification, // ← Uses config
);
```

**Ensure:**
- `FRONTEND_URL` is set in backend `.env`
- `AUTH_REDIRECTS.afterEmailVerification` points to correct path

---

## Session/Cookie Issues

### Problem: Session not persisting across requests

**Check:**
1. Cookie domain settings (production):
```ts
// packages/auth/src/auth.ts
advanced: {
  defaultCookieAttributes: {
    domain: ".example.com", // ← Must match your domain
  },
}
```

2. Secure cookies (production):
```ts
advanced: {
  useSecureCookies: true, // ← Must be true for HTTPS
}
```

---

## Environment Variable Issues

### Problem: Config not loading from .env

**Check:**
1. File name is exactly `.env` (not `.env.local` unless configured)
2. Variables prefixed with `VITE_` for frontend
3. Restart dev server after changing `.env`

**Frontend (.env):**
```env
VITE_FRONTEND_URL=http://localhost:5173  # ← Must have VITE_ prefix
VITE_API_BASE_URL=http://localhost:8080
```

**Backend (.env):**
```env
BETTER_AUTH_URL=http://localhost:8080  # ← No prefix needed
FRONTEND_URL=http://localhost:5173
```

---

## Build/Type Errors

### Problem: TypeScript errors after config changes

**Solution:**
```bash
# Clear cache and rebuild
bun run build

# Or for specific app
cd apps/web && bun run build
```

---

## Testing Checklist

When debugging auth issues, check:

- [ ] Frontend `.env` has `VITE_FRONTEND_URL` and `VITE_API_BASE_URL`
- [ ] Backend `.env` has `BETTER_AUTH_URL` and `FRONTEND_URL`
- [ ] `AuthUIProvider` has `baseURL={APP_URLS.frontend}`
- [ ] OAuth credentials are correct (if using social login)
- [ ] `ALLOWED_ORIGINS` includes your frontend URL
- [ ] Dev server restarted after `.env` changes
- [ ] No hardcoded URLs in code (use configs)

---

## Getting Help

If you're still stuck:

1. Check [Better Auth Docs](https://www.better-auth.com/docs)
2. Review [Better Auth GitHub Issues](https://github.com/better-auth/better-auth/issues)
3. Check browser console for errors
4. Check backend logs for errors
