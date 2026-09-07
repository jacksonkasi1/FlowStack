# Architecture Overview

> **Level:** 🟡 Intermediate | **Time:** ⏱️ 15 min

Understanding FlowStack's architecture and design principles.

---

## Design Philosophy

> **"Make the architecture obvious, boring, and easy to evolve."**

FlowStack follows these core principles:

1. **One responsibility per file** — No god files
2. **One responsibility per folder** — Folders = domains
3. **Apps compose, packages own logic** — Clear separation
4. **Boring code > clever code** — Explicit over magic

---

## High-Level Structure

```
FlowStack/
├── apps/                    # 🖥️ Runnable applications
│   ├── web/                 # Customer frontend (React)
│   ├── tanstack/            # Alternative frontend (TanStack)
│   └── server/              # Backend API (Hono)
│
├── packages/                # 📦 Shared logic
│   ├── auth/                # Identity (who are you?)
│   ├── auth-ui/             # Auth UI components & guards
│   ├── onboarding/          # User onboarding plugin
│   ├── db/                  # Database schema & migrations
│   ├── env/                 # Typed environment variables
│   └── ui/                  # Shared UI components
│
└── docs/                    # 📖 Documentation
```

---

## Package Responsibilities

### `@repo/auth`

**Purpose:** Identity management

| File | Purpose |
|------|---------|
| `src/auth.ts` | Main Better Auth configuration |
| `src/config/redirects.ts` | Redirect paths |
| `src/email/*.ts` | Email sending functions |

### `@repo/auth-ui`

**Purpose:** Frontend auth components

| Directory | Purpose |
|-----------|---------|
| `guards/react-router/` | Guards for React Router |
| `guards/tanstack-router/` | Guards for TanStack Router |
| `components/` | Shared auth UI components |

### `@repo/onboarding`

**Purpose:** Multi-step user setup

| File | Purpose |
|------|---------|
| `src/index.ts` | Plugin definition |
| `src/adapter.ts` | Database adapter |
| `src/client.ts` | Frontend hooks |

### `@repo/db`

**Purpose:** Database layer

| Directory | Purpose |
|-----------|---------|
| `src/schema/` | Drizzle table definitions |
| `drizzle/` | Migration files |

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  Pages  │───▶│ Guards  │───▶│ Auth    │───▶│  API    │  │
│  │         │    │         │    │ Client  │    │ Client  │  │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘  │
└────────────────────────────────────────────────────┼────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  Hono   │───▶│ Better  │───▶│ Plugins │───▶│   DB    │  │
│  │  Routes │    │  Auth   │    │         │    │         │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration Flow

All feature decisions live in configuration files:

```
apps/web/src/config/
├── urls.ts        # Frontend/API URLs
└── redirects.ts   # Redirect paths

packages/auth/src/config/
├── redirects.ts   # Backend redirect paths
└── organization.ts # Org requirements
```

Runtime code assumes decisions are already made — no `if (config.xxx)` checks in business logic.

---

## 👉 Next

- [Protected Routes](../auth/protected-routes.md) — Implement route protection
- [Configuration](../auth/configuration.md) — All config options
