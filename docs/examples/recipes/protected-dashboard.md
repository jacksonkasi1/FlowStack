# Protected Dashboard Recipe

> **Level:** 🟢 Beginner | **Time:** ⏱️ 5 min

A complete example of a protected dashboard page.

---

## Full Example

### Page Component

**File:** `apps/web/src/pages/Dashboard.tsx`

```tsx
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";
import { authClient } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="dashboard">
          <h1>Dashboard</h1>
          
          {isPending ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p>Welcome, {session?.user?.name || "User"}!</p>
              <p>Email: {session?.user?.email}</p>
            </div>
          )}

          <button onClick={() => authClient.signOut()}>
            Sign Out
          </button>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
```

### Route Configuration

**File:** `apps/web/src/App.tsx`

```tsx
import { Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";

// Add to your routes:
<Route path="/dashboard" element={<Dashboard />} />
```

---

## With Onboarding Check

If you require onboarding to be complete:

```tsx
import { ProtectedRoute, RequireOnboarding } from "@repo/auth-ui/guards/react-router";

export default function Dashboard() {
  return (
    <RequireOnboarding>
      <ProtectedRoute>
        <AppLayout>
          {/* Content only shows for onboarded, authenticated users */}
          <h1>Dashboard</h1>
        </AppLayout>
      </ProtectedRoute>
    </RequireOnboarding>
  );
}
```

---

## Key Points

- `ProtectedRoute` redirects unauthenticated users to `/auth/sign-in`
- `RequireOnboarding` redirects users who haven't completed onboarding
- Use `authClient.useSession()` to access user data
- `isPending` handles the loading state

---

## 👉 Related

- [Protected Routes Guide](../../auth/protected-routes.md)
- [Onboarding System](../../auth/onboarding.md)
