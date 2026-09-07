# First Steps

> **Level:** 🟢 Beginner | **Time:** ⏱️ 15 min | **Prerequisites:** [Quick Start](./quickstart.md)

Now that FlowStack is running, let's make your first customizations.

---

## What You'll Learn

- ✅ Change the default redirect after login
- ✅ Create a protected route
- ✅ Understand the file structure
- ✅ Customize the sign-in page

---

## 1. Change the Default Redirect

After login, users are redirected to `/dashboard`. Let's change it to `/home`.

### Frontend

**File:** `apps/web/src/config/redirects.ts`

```ts
export const AUTH_REDIRECTS = {
  afterLogin: "/home", // ← Change here
} as const;
```

### Backend

**File:** `packages/auth/src/config/redirects.ts`

```ts
export const AUTH_REDIRECTS = {
  afterLogin: "/home", // ← Must match frontend
  afterEmailVerification: "/home",
  afterMagicLink: "/home",
  // ...
} as const;
```

> **Important:** Both files must have the same value for consistent behavior.

---

## 2. Create a Protected Route

Let's create a `/home` page that requires authentication.

### Create the Page

**File:** `apps/web/src/pages/Home.tsx`

```tsx
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Home() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <h1>Welcome Home!</h1>
        <p>This content is only visible to logged-in users.</p>
      </AppLayout>
    </ProtectedRoute>
  );
}
```

### Add the Route

**File:** `apps/web/src/App.tsx`

```tsx
import Home from "@/pages/Home";

// In your routes:
<Route path="/home" element={<Home />} />
```

### Test It

1. Log out (click your avatar → Sign Out)
2. Try to visit http://localhost:5173/home
3. You should be redirected to the sign-in page
4. Sign in → You'll land on the Home page

---

## 3. Understand the File Structure

Here's what's important:

```
FlowStack/
├── apps/
│   ├── web/                 # 👈 Main frontend app
│   │   ├── src/
│   │   │   ├── config/      # URL and redirect settings
│   │   │   ├── pages/       # Your pages
│   │   │   └── components/  # UI components
│   │   └── .env             # Frontend env vars
│   └── server/              # Backend API
│
├── packages/
│   ├── auth/                # 👈 Authentication logic
│   │   ├── src/auth.ts      # Main auth config
│   │   └── src/config/      # Backend config
│   ├── auth-ui/             # Auth UI components & guards
│   └── db/                  # Database schema
│
└── docs/                    # 👈 You are here!
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `packages/auth/src/auth.ts` | Main Better Auth configuration |
| `apps/web/src/config/urls.ts` | Frontend/API URLs |
| `apps/web/src/config/redirects.ts` | Where to redirect after login |
| `apps/web/src/providers.tsx` | App providers setup |

---

## 4. Customize the Sign-In Page

The auth pages use [Better Auth UI](https://www.better-auth.com/docs/integrations/ui-libraries). You can customize them in the provider.

**File:** `apps/web/src/providers.tsx`

```tsx
<AuthUIProvider
  baseURL={APP_URLS.frontend}
  // Add customizations:
  logo="/your-logo.svg"
  title="Welcome to Your App"
>
  {children}
</AuthUIProvider>
```

---

## ✅ What You've Accomplished

- [x] Changed the default redirect path
- [x] Created a protected route
- [x] Understand the file structure
- [x] Know where to customize auth UI

---

## 👉 Next Steps

### 🟡 Ready for More?

- [Protected Routes Guide](../auth/protected-routes.md) — Deep dive on route protection
- [Configuration Reference](../auth/configuration.md) — All config options
- [Onboarding Flow](../auth/onboarding.md) — Multi-step user setup

### 🔴 Building Something Complex?

- [Organization Invitations](../auth/organization-invitations.md) — Team invites
- [Cross-Domain Auth](../auth/cross-domain-auth.md) — Multi-subdomain login
