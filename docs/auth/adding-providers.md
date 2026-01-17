# Adding OAuth Providers

Quick guide to add new social login providers (GitHub, Discord, Twitter, etc.).

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
| Google | `google` | [Docs](https://www.better-auth.com/docs/authentication/social#google) |
| GitHub | `github` | [Docs](https://www.better-auth.com/docs/authentication/social#github) |
| Discord | `discord` | [Docs](https://www.better-auth.com/docs/authentication/social#discord) |
| Twitter | `twitter` | [Docs](https://www.better-auth.com/docs/authentication/social#twitter) |
| Apple | `apple` | [Docs](https://www.better-auth.com/docs/authentication/social#apple) |

## References

- [Better Auth Social Providers](https://www.better-auth.com/docs/authentication/social)
- [OAuth Configuration](https://www.better-auth.com/docs/concepts/oauth)
