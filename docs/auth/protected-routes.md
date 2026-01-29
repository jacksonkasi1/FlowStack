# Protected Routes

> **Level:** 🟢 Beginner | **Time:** ⏱️ 5 min | **Prerequisites:** [Quick Start](../getting-started/quickstart.md)

Protect pages that require authentication using the `ProtectedRoute` component from `@repo/auth-ui`.

---

## What You'll Learn

- ✅ Protect any page with authentication
- ✅ Customize the sign-in redirect path
- ✅ Combine with onboarding guards

---

## Installation

The `@repo/auth-ui` package provides framework-specific guards:

```tsx
// For React Router DOM (apps/web)
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";

// For TanStack Router (apps/tanstack)
import { ProtectedRoute } from "@repo/auth-ui/guards/tanstack-router";
```

---

## Basic Usage

Wrap your protected page content with `ProtectedRoute`. Unauthenticated users are automatically redirected to the sign-in page.

```tsx
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div>Your protected content here</div>
      </AppLayout>
    </ProtectedRoute>
  );
}
```

---

## Custom Sign-In Path

Change the redirect destination using the `signInPath` prop:

```tsx
<ProtectedRoute signInPath="/login">
  <AppLayout>
    <div>Content</div>
  </AppLayout>
</ProtectedRoute>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `signInPath` | `string` | `/auth/sign-in` | Where to redirect unauthenticated users |
| `onUnauthenticated` | `() => void` | - | Callback called when user is not authenticated |

---

## With Onboarding

Combine with `RequireOnboarding` for full protection:

```tsx
import { ProtectedRoute, RequireOnboarding } from "@repo/auth-ui/guards/react-router";

export default function Dashboard() {
  return (
    <RequireOnboarding>
      <ProtectedRoute>
        <AppLayout>
          <div>Protected + Onboarded content</div>
        </AppLayout>
      </ProtectedRoute>
    </RequireOnboarding>
  );
}
```

---

## How It Works

- Uses `SignedIn` and `SignedOut` from `@daveyplate/better-auth-ui`
- Renders children only for authenticated users
- Redirects unauthenticated users to the specified path
- Works with both React Router DOM and TanStack Router

---

## 👉 Next Steps

- [Onboarding Flow](./onboarding.md) — Add multi-step user setup
- [Configuration](./configuration.md) — Customize redirect paths
