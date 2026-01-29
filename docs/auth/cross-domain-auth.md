# Cross-Domain Authentication

> **Level:** 🔴 Advanced | **Time:** ⏱️ 20 min | **Prerequisites:** [Configuration](./configuration.md)

Configure auth for multi-subdomain or cross-domain setups.

---

## What You'll Learn

- ✅ Set up authentication across multiple domains
- ✅ Configure cookie sharing for subdomains
- ✅ Handle CORS for cross-domain requests

---

## Use Cases

- `app.example.com` + `api.example.com` (subdomains)
- `example.com` + `dashboard.example.com`
- Multiple frontends sharing one auth backend

---

## Configuration

### 1. Trusted Origins

In `packages/auth/src/auth.ts`:

```ts
const trustedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];
```

Set in `.env`:

```env
ALLOWED_ORIGINS=https://app.example.com,https://dashboard.example.com
FRONTEND_URL=https://app.example.com
```

### 2. Cookie Settings

For subdomain sharing:

```ts
advanced: {
  defaultCookieAttributes: {
    sameSite: "lax",
    secure: true,
    httpOnly: true,
    path: "/",
    domain: ".example.com",  // ← Note the leading dot
  },
},
```

### 3. CORS (if using Hono/Express)

```ts
app.use(
  cors({
    origin: trustedOrigins,
    credentials: true,
  })
);
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `FRONTEND_URL` | Primary frontend URL | `https://app.example.com` |
| `ALLOWED_ORIGINS` | All trusted origins | `https://app.example.com,https://dashboard.example.com` |
| `DOMAIN` | Cookie domain | `.example.com` |

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/auth/src/auth.ts` | Cookie domain, trusted origins |
| `.env` | Add `ALLOWED_ORIGINS`, `DOMAIN` |
| `apps/server/src/index.ts` | CORS configuration |

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
