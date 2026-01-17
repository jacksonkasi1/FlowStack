# Cross-Domain Authentication

Configure auth for multi-subdomain or cross-domain setups.

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

- [Better Auth Trusted Origins](https://www.better-auth.com/docs/reference/options#trustedorigins)
- [Cookie Configuration](https://www.better-auth.com/docs/reference/options#advanced)
