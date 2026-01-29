# Cheatsheet

> **Quick reference for common tasks.** Bookmark this page!

---

## 🔐 Authentication

### Check if User is Logged In

```tsx
import { authClient } from "@/lib/auth-client";

const { data: session } = await authClient.useSession();
if (session) {
  // User is logged in
}
```

### Sign Out

```tsx
await authClient.signOut();
```

### Protect a Route

```tsx
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";

<ProtectedRoute>
  <YourProtectedContent />
</ProtectedRoute>
```

---

## ⚙️ Configuration

### Change Redirect After Login

```ts
// apps/web/src/config/redirects.ts
export const AUTH_REDIRECTS = {
  afterLogin: "/your-path",
} as const;

// packages/auth/src/config/redirects.ts (must match!)
export const AUTH_REDIRECTS = {
  afterLogin: "/your-path",
} as const;
```

### Change API URL

```ts
// apps/web/src/config/urls.ts
export const APP_URLS = {
  api: "https://your-api.com",
} as const;
```

---

## 🏢 Organizations

### Check Organization Membership

```tsx
const { data: orgs } = await authClient.organization.list();
const hasOrg = orgs && orgs.length > 0;
```

### Create Organization

```tsx
await authClient.organization.create({
  name: "My Company",
  slug: "my-company",
});
```

---

## 🚀 Onboarding

### Check Onboarding Status

```tsx
const { data } = await authClient.onboarding.status();
// { shouldOnboard, currentStep, completedSteps }
```

### Complete Step

```tsx
await authClient.onboarding.completeStep("stepId", { data });
```

### Skip Optional Step

```tsx
await authClient.onboarding.skipStep("stepId");
```

---

## 🗄️ Environment Variables

### Frontend (.env)

```env
VITE_FRONTEND_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8080
```

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
BETTER_AUTH_SECRET=your-secret-32-chars-minimum
BETTER_AUTH_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173
```

---

## 📁 Key Files

| What to Change | File to Edit |
|----------------|--------------|
| Login redirect | `config/redirects.ts` (both) |
| Frontend URL | `apps/web/src/config/urls.ts` |
| API URL | `apps/web/src/config/urls.ts` |
| Auth config | `packages/auth/src/auth.ts` |
| Database schema | `packages/db/src/schema/` |
| Onboarding steps | `packages/auth/src/auth.ts` |
| Email templates | `packages/auth/src/email/` |

---

## 🔧 Quick Commands

```bash
# Install dependencies
bun install

# Run development
bun run dev

# Database migrations
bun run db:push

# Type checking
bun run typecheck

# Linting
bun run lint
```

---

## 🆘 Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Session not found | Clear cookies, re-login |
| CORS error | Check `ALLOWED_ORIGINS` in `.env` |
| Database error | Verify `DATABASE_URL` |
| Auth redirect loop | Check `FRONTEND_URL` matches |

See [Troubleshooting](../auth/troubleshooting.md) for more.
