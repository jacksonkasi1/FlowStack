# Configuration Reference

Centralized configuration files for authentication setup.

## Configuration Files

### URL Configuration (`config/urls.ts`)

**Location:** `apps/web/src/config/urls.ts`, `apps/tanstack/src/config/urls.ts`

```ts
export const APP_URLS = {
  frontend: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
  api: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
} as const;
```

**Usage:**
```tsx
import { APP_URLS } from "@/config/urls";

// In providers
<AuthUIProvider baseURL={APP_URLS.frontend} />

// In API client
const apiClient = axios.create({ baseURL: APP_URLS.api });
```

---

### Redirect Configuration (`config/redirects.ts`)

#### Frontend Config

**Location:** `apps/web/src/config/redirects.ts`, `apps/tanstack/src/config/redirects.ts`

```ts
export const AUTH_REDIRECTS = {
  afterLogin: "/dashboard",
} as const;
```

#### Backend Config

**Location:** `packages/auth/src/config/redirects.ts`

```ts
export const AUTH_REDIRECTS = {
  afterLogin: "/dashboard",
  afterEmailVerification: "/dashboard",
  afterMagicLink: "/dashboard",
  organizationInvitation: "/accept-invitation",
} as const;
```

**Usage:**
```tsx
// Frontend
import { AUTH_REDIRECTS } from "@/config/redirects";
const redirectTo = AUTH_REDIRECTS.afterLogin;

// Backend
import { AUTH_REDIRECTS } from "./config/redirects";
const url = buildEmailUrlWithFrontendCallback(url, AUTH_REDIRECTS.afterLogin);
```

---

### Organization Configuration (`config/organization.ts`)

**Location:** `packages/auth/src/config/organization.ts` (backend), `apps/web/src/config/organization.ts` (frontend)

```ts
export const ORGANIZATION_CONFIG = {
  /**
   * If true, users MUST belong to an organization to use the product.
   * If false, users can access the product without an organization.
   * @default true
   */
  requireOrganization: true,
} as const;
```

**Usage:**
```ts
import { ORGANIZATION_CONFIG } from "./config/organization";

if (ORGANIZATION_CONFIG.requireOrganization && !hasOrgMembership) {
  // Force user to create organization
}
```

> **Note:** This config must match between frontend and backend for proper enforcement.

---

## Environment Variables

### Frontend (`.env`)

```env
# Frontend URL (for OAuth callbacks)
VITE_FRONTEND_URL=http://localhost:5173

# Backend API URL
VITE_API_BASE_URL=http://localhost:8080
```

### Backend (`.env`)

```env
# Better Auth Configuration
BETTER_AUTH_URL=http://localhost:8080
BETTER_AUTH_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (Optional)
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=FlowStack

# CORS (Optional)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Domain (Production)
DOMAIN=.example.com
NODE_ENV=production
```

---

## Customization Guide

### Change Default Redirect After Login

**Frontend:**
```ts
// apps/web/src/config/redirects.ts
export const AUTH_REDIRECTS = {
  afterLogin: "/home", // ← Change here
} as const;
```

**Backend:**
```ts
// packages/auth/src/config/redirects.ts
export const AUTH_REDIRECTS = {
  afterLogin: "/home", // ← Change here
  // ...
} as const;
```

### Change Frontend URL

```ts
// apps/web/src/config/urls.ts
export const APP_URLS = {
  frontend: "https://app.example.com", // ← Hardcode or use env var
  api: "https://api.example.com",
} as const;
```

### Add New OAuth Provider

See [Adding Providers](./adding-providers.md) guide.

---

## Quick Reference

| What to Change | File to Edit |
|----------------|--------------|
| Login redirect path | `config/redirects.ts` (frontend + backend) |
| Frontend URL | `config/urls.ts` (frontend) |
| API URL | `config/urls.ts` (frontend) |
| OAuth providers | `packages/auth/src/auth.ts` |
| Email templates | `packages/auth/src/email/*.ts` |
| Trusted origins | `.env` → `ALLOWED_ORIGINS` |
