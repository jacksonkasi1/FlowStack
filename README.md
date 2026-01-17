# FlowStack

**FlowStack** is a production-grade SaaS foundation focused on **clean architecture, clear boundaries, and long-term maintainability**.

It is not a framework.
It is not a boilerplate with magic.

FlowStack is a **base repository** designed to help you build scalable products without losing control of your codebase.

---

## Why FlowStack?

Most starters focus on **tech stack choices**.

FlowStack focuses on **flow**:

- how identity flows
- how permissions flow
- how responsibility flows
- how code grows without becoming messy

The goal is simple:

> **Make the architecture obvious, boring, and easy to evolve.**

---

## Core Principles

### 1. One Responsibility per File

- One action per file
- One API per file
- One schema per file

No large "god files".

---

### 2. One Responsibility per Folder

Folders represent **domains**, not features.

Examples:

- `auth` → identity (who are you?)
- `access` → permissions (what can you do?)
- `impersonation` → temporary identity
- `platform` → operator / super-admin logic

If a folder exists, the feature exists.
No runtime feature flags.

---

### 3. No Runtime Branching for Product Shape

There are **no** `if (config.xxx)` checks inside business logic.

All variability is resolved at **generation time**:

- modules are included or excluded
- unused folders are removed
- runtime code stays clean and predictable

---

### 4. Apps Compose, Packages Own Logic

- `apps/` contain routing and wiring
- `packages/` contain real logic

Apps never own business rules.

---

### 5. Boring Code > Clever Code

FlowStack prefers:

- explicit files
- explicit imports
- explicit boundaries

Over abstraction is avoided on purpose.

---

## Core Stack (Defaults, Not Lock-in)

FlowStack is **stack-aware**, but not stack-locked.

See **[docs/stack.md](./docs/stack.md)** for the default technologies and design philosophy.

These are tools FlowStack is built and tested with. You can replace parts of the stack if you know what you're doing.

---

## Authentication

FlowStack uses [Better Auth](https://www.better-auth.com/) for identity management with support for:

- Email/password authentication
- Magic link authentication
- OAuth providers (Google, GitHub, etc.)
- Session management
- Account settings and security

For detailed setup, configuration, and troubleshooting guides, see **[docs/auth/README.md](./docs/auth/README.md)**.

---

## High-Level Structure

```
apps/
  web/            # Customer frontend
  server/         # Customer API
  super-admin/    # Operator panel (optional)

packages/
  auth/           # Identity
  access/         # Authorization (RBAC)
  impersonation/  # Temporary identity
  platform/       # Operator-level control
  db/             # Database schema & migrations
  env/            # Typed environment
  email/          # Email providers & templates
  storage/        # File storage
  workflows/      # Background jobs
```

Each package is **independently understandable**.

---

## Configuration

All feature decisions live in one place:

```ts
flow.config.ts;
```

This file answers **what exists**, not **how it works**.

Example:

- auth mode
- super-admin enabled or not
- impersonation enabled or not
- deployment targets

Runtime code assumes the decision is already made.

---

## What This Repo Is (and Isn't)

✅ A clean, extensible foundation
✅ A reference architecture
✅ A long-term base for real products

❌ Not a "plug and play" SaaS
❌ Not opinionated about UI design
❌ Not a low-code framework

You are expected to **build on top of it**.

---

## Current Status

FlowStack is an **active base repository**.

Features will be added incrementally:

- more auth flows
- more workflow primitives
- more deployment helpers

Breaking changes may happen early while the foundation is being refined.

---

## Philosophy

> Scale is not about features.
> Scale is about clarity.

FlowStack exists to keep that clarity intact as products grow.

---

## License

MIT
