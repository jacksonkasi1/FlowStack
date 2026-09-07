# 💻 Examples & Recipes

Copy-paste code examples for common patterns.

---

## Contents

| Recipe | Level | Description |
|--------|-------|-------------|
| [Protected Dashboard](./recipes/protected-dashboard.md) | 🟢 | Basic protected page setup |
| [Invite Flow](./recipes/invite-flow.md) | 🟡 | Organization invitation UI |

---

## Quick Examples

### Protected Page

```tsx
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <h1>Dashboard</h1>
      <p>This is protected content.</p>
    </ProtectedRoute>
  );
}
```

### Show Different Content for Auth State

```tsx
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

export default function HomePage() {
  return (
    <>
      <SignedIn>
        <p>Welcome back!</p>
        <a href="/dashboard">Go to Dashboard</a>
      </SignedIn>
      <SignedOut>
        <p>Please sign in to continue.</p>
        <a href="/auth/sign-in">Sign In</a>
      </SignedOut>
    </>
  );
}
```

### Get Current User

```tsx
import { authClient } from "@/lib/auth-client";

function UserProfile() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p>Loading...</p>;
  if (!session) return <p>Not logged in</p>;

  return (
    <div>
      <p>Name: {session.user.name}</p>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

---

## 👉 Browse: [All Recipes](./recipes/)
