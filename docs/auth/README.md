# Authentication Documentation

Quick reference guides for FlowStack authentication setup using [Better Auth](https://www.better-auth.com/) and [@daveyplate/better-auth-ui](https://github.com/daveyplate/better-auth-ui).

---

## 📋 Guides by Skill Level

### 🟢 Beginner

Start here if you're new to FlowStack auth:

| Guide | Time | Description |
|-------|------|-------------|
| [Protected Routes](./protected-routes.md) | ⏱️ 5 min | Protect pages requiring authentication |
| [Configuration](./configuration.md) | ⏱️ 10 min | Centralized config reference |

### 🟡 Intermediate

For developers building real features:

| Guide | Time | Description |
|-------|------|-------------|
| [Onboarding](./onboarding.md) | ⏱️ 20 min | Multi-step onboarding system |
| [Organization Invitations](./organization-invitations.md) | ⏱️ 15 min | Team invite flows |
| [Adding Providers](./adding-providers.md) | ⏱️ 10 min | Add OAuth providers (GitHub, etc.) |
| [OAuth Redirects](./oauth-redirects.md) | ⏱️ 10 min | Handle social login redirects |
| [Email Templates](./email-templates.md) | ⏱️ 10 min | Customize auth emails |

### 🔴 Advanced

Deep customization for complex requirements:

| Guide | Time | Description |
|-------|------|-------------|
| [User Metadata](./user-metadata.md) | ⏱️ 15 min | Custom fields on user signup |
| [Cross-Domain Auth](./cross-domain-auth.md) | ⏱️ 20 min | Multi-subdomain login |

### 🆘 Help

| Guide | Description |
|-------|-------------|
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |

---

## 📁 Key Files Overview

### Configuration Files

| File | Purpose |
|------|---------|
| `apps/*/src/config/urls.ts` | Frontend/API URLs (`APP_URLS`) |
| `apps/*/src/config/redirects.ts` | Frontend redirect paths |
| `packages/auth/src/config/redirects.ts` | Backend redirect paths |

### Backend (`packages/auth/`)

| File | Purpose |
|------|---------|
| `src/auth.ts` | Main Better Auth configuration |
| `src/email/*.ts` | Email sending functions |
| `src/types.ts` | Environment variable types |

### Frontend (`apps/web/` or `apps/tanstack/`)

| File | Purpose |
|------|---------|
| `src/lib/auth-client.ts` | Auth client configuration |
| `src/providers.tsx` | AuthUIProvider setup |
| `src/pages/auth/*.tsx` | Auth page components |

---

## 🔗 External References

- 📚 [Better Auth Docs](https://www.better-auth.com/docs)
- 📚 [Better Auth UI Docs](https://www.better-auth.com/docs/integrations/ui-libraries)
- 🔧 [OAuth Concepts](https://www.better-auth.com/docs/concepts/oauth)
- 🔧 [Social Providers Options](https://www.better-auth.com/docs/reference/options#socialproviders)

---

## 👉 Getting Started

New to FlowStack? Start with our [Quick Start Guide](../getting-started/quickstart.md).
