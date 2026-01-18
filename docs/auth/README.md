# Authentication Documentation

Quick reference guides for FlowStack authentication setup using [Better Auth](https://www.better-auth.com/) and [@daveyplate/better-auth-ui](https://github.com/daveyplate/better-auth-ui).

## Quick Links

| Topic                                                     | Description                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| [Configuration](./configuration.md)                       | ⭐ Centralized config reference (URLs, redirects, env vars) |
| [User Metadata](./user-metadata.md)                       | ⭐ Adding custom fields to user signup                      |
| [Onboarding](./onboarding.md)                             | ⭐ Multi-step onboarding system setup and customization     |
| [Organization Invitations](./organization-invitations.md) | ⭐ Invitation flow, hooks, and membership enforcement       |
| [Protected Routes](./protected-routes.md)                 | Protect pages requiring authentication                      |
| [OAuth Redirects](./oauth-redirects.md)                   | Handle redirects after Google/social login                  |
| [Adding Providers](./adding-providers.md)                 | Add new OAuth providers (GitHub, Discord, etc.)             |
| [Cross-Domain Auth](./cross-domain-auth.md)               | Multi-subdomain & cross-domain login                        |
| [Email Templates](./email-templates.md)                   | Customize verification & reset emails                       |
| [Troubleshooting](./troubleshooting.md)                   | Common issues and solutions                                 |

---

## Key Files Overview

### Configuration Files

| File                                    | Purpose                        |
| --------------------------------------- | ------------------------------ |
| `apps/*/src/config/urls.ts`             | Frontend/API URLs (`APP_URLS`) |
| `apps/*/src/config/redirects.ts`        | Frontend redirect paths        |
| `packages/auth/src/config/redirects.ts` | Backend redirect paths         |

### Backend (`packages/auth/`)

| File             | Purpose                        |
| ---------------- | ------------------------------ |
| `src/auth.ts`    | Main Better Auth configuration |
| `src/email/*.ts` | Email sending functions        |
| `src/types.ts`   | Environment variable types     |

### Frontend (`apps/web/` or `apps/tanstack/`)

| File                                     | Purpose                                 |
| ---------------------------------------- | --------------------------------------- |
| `src/lib/auth-client.ts`                 | Auth client configuration               |
| `src/providers.tsx`                      | AuthUIProvider setup                    |
| `src/components/auth/ProtectedRoute.tsx` | Protect routes requiring authentication |
| `src/pages/auth/*.tsx`                   | Auth page components                    |

---

## External References

- 📚 [Better Auth Docs](https://www.better-auth.com/docs)
- 📚 [Better Auth UI Docs](https://www.better-auth.com/docs/integrations/ui-libraries)
- 🔧 [OAuth Concepts](https://www.better-auth.com/docs/concepts/oauth)
- 🔧 [Social Providers Options](https://www.better-auth.com/docs/reference/options#socialproviders)
