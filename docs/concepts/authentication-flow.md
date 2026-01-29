# Authentication Flow

> **Level:** 🟢 Beginner | **Time:** ⏱️ 10 min

Understand how authentication works in FlowStack from sign-up to protected content.

---

## User Journey

### 1. Sign Up Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Better Auth
    participant D as Database

    U->>F: Clicks "Sign Up"
    F->>A: POST /auth/sign-up
    A->>D: Create user record
    D-->>A: User created
    A->>D: Create session
    D-->>A: Session created
    A-->>F: Session cookie set
    F-->>U: Redirected to onboarding
```

### 2. Sign In Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Better Auth
    participant D as Database

    U->>F: Enters credentials
    F->>A: POST /auth/sign-in
    A->>D: Validate credentials
    D-->>A: User verified
    A->>D: Create session
    A-->>F: Session cookie set
    F-->>U: Redirected to dashboard
```

### 3. Protected Route Access

```mermaid
sequenceDiagram
    participant U as User
    participant G as Guard
    participant A as Auth Client
    participant P as Page

    U->>G: Visits /dashboard
    G->>A: Check session
    alt Has valid session
        A-->>G: Session valid
        G->>P: Render page
        P-->>U: Dashboard content
    else No session
        A-->>G: No session
        G-->>U: Redirect to /auth/sign-in
    end
```

---

## Key Concepts

### Sessions

- Sessions are stored in the database
- A session cookie is set in the browser
- Sessions have an expiry time (configurable)
- Multiple sessions per user are supported

### Guards

Guards are React components that check authentication:

| Guard | Purpose |
|-------|---------|
| `ProtectedRoute` | Requires user to be signed in |
| `RequireOnboarding` | Requires onboarding to be complete |
| `SignedIn` | Renders children only if signed in |
| `SignedOut` | Renders children only if signed out |

### Auth Client

The auth client (`authClient`) provides:
- Session state management
- API methods for auth operations
- Hooks for React components

```tsx
import { authClient } from "@/lib/auth-client";

// Get current session
const { data: session } = await authClient.useSession();

// Sign out
await authClient.signOut();
```

---

## 👉 Next: [Architecture Overview](./architecture.md)
