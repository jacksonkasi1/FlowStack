# Authentication Documentation

Quick reference guides for FlowStack authentication setup using [Better Auth](https://www.better-auth.com/) and [@daveyplate/better-auth-ui](https://github.com/daveyplate/better-auth-ui).

## Quick Links

| Topic | Description |
|-------|-------------|
| [OAuth Redirects](./oauth-redirects.md) | Handle redirects after Google/social login |
| [Adding Providers](./adding-providers.md) | Add new OAuth providers (GitHub, Discord, etc.) |
| [Cross-Domain Auth](./cross-domain-auth.md) | Multi-subdomain & cross-domain login |
| [Email Templates](./email-templates.md) | Customize verification & reset emails |

---

## Key Files Overview

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

## External References

- 📚 [Better Auth Docs](https://www.better-auth.com/docs)
- 📚 [Better Auth UI Docs](https://www.better-auth.com/docs/integrations/ui-libraries)
- 🔧 [OAuth Concepts](https://www.better-auth.com/docs/concepts/oauth)
- 🔧 [Social Providers Options](https://www.better-auth.com/docs/reference/options#socialproviders)
