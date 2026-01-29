# Adding OAuth Providers

> **Level:** 🟡 Intermediate | **Time:** ⏱️ 10 min | **Prerequisites:** [Configuration](./configuration.md)

Quick guide to add new social login providers (GitHub, Discord, Twitter, etc.).

---

## What You'll Learn

- ✅ Add new OAuth providers (GitHub, Discord, etc.)
- ✅ Configure provider credentials
- ✅ Enable providers in the UI

---

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `packages/auth/src/auth.ts` | Add provider config |
| 2 | `.env` | Add client ID & secret |
| 3 | `apps/*/src/providers.tsx` | Enable in UI |

---

## Step 1: Backend Config

Add provider in `packages/auth/src/auth.ts`:

```ts
const socialProviders: Record<string, unknown> = {};

// Google (existing)
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

// GitHub (new)
if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}
```

## Step 2: Environment Variables

Add to `.env`:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

Update `packages/auth/src/types.ts`:

```ts
export interface Env {
  // ... existing
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}
```

## Step 3: Frontend UI

Update `apps/web/src/providers.tsx`:

```tsx
<AuthUIProvider
  social={{
    providers: ["google", "github"],  // ← Add here
  }}
>
```

---

## Available Providers

| Provider | ID | Docs |
|----------|-----|------|
| Google | `google` | [OAuth Guide](https://www.better-auth.com/docs/concepts/oauth) |
| GitHub | `github` | [OAuth Guide](https://www.better-auth.com/docs/concepts/oauth) |
| Discord | `discord` | [OAuth Guide](https://www.better-auth.com/docs/concepts/oauth) |
| Twitter | `twitter` | [OAuth Guide](https://www.better-auth.com/docs/concepts/oauth) |
| Apple | `apple` | [OAuth Guide](https://www.better-auth.com/docs/concepts/oauth) |

## References

- [Better Auth OAuth Guide](https://www.better-auth.com/docs/concepts/oauth)
