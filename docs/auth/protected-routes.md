# Protected Routes

Protect pages that require authentication using the `ProtectedRoute` component.

## Usage

Wrap your protected page content with `ProtectedRoute`. Unauthenticated users are automatically redirected to the sign-in page.

```tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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

## Custom Redirect

Change the redirect destination using the `redirectTo` prop:

```tsx
<ProtectedRoute redirectTo="/auth/sign-up">
  <AppLayout>
    <div>Content</div>
  </AppLayout>
</ProtectedRoute>
```

## File Location

| App      | Path                                                   |
| -------- | ------------------------------------------------------ |
| web      | `apps/web/src/components/auth/ProtectedRoute.tsx`      |
| tanstack | `apps/tanstack/src/components/auth/ProtectedRoute.tsx` |

## How It Works

- Uses `SignedIn` and `SignedOut` from `@daveyplate/better-auth-ui`
- Renders children only for authenticated users
- Redirects unauthenticated users to the specified path
- Works with both Vite (React Router) and TanStack Start
