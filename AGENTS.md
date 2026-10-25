# FlowStack agent guide

The canonical development rules for this repository. `CLAUDE.md` and `AGENT.md` point here; edit this file only.

FlowStack is a SaaS starter: a Bun + Turborepo monorepo with a Hono API on Node.js, two interchangeable React frontends, Better Auth, Drizzle on PostgreSQL, Cloudflare R2 and ZeptoMail. One codebase serves two account models (personal, organization) and two frontends (React Router, TanStack Start); `bun run setup` chooses one of each per project.

## Where code lives

| Path                                                   | Owns                                                                                                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server`                                          | Hono API (`src/app.ts` builds the app, `src/index.ts` serves it). Routes in `src/routes/<domain>/`, one endpoint per file, an `index.ts` router per domain. |
| `apps/web`                                             | React + React Router frontend. Pages in `src/pages`, API calls in `src/rest-api/<domain>/`.                                                                 |
| `apps/tanstack`                                        | TanStack Start frontend. File routes in `src/routes` (`routeTree.gen.ts` is generated), API calls in `src/rest-api/<domain>/`.                              |
| `packages/config`                                      | Settings shared by API and frontends: `preset.ts` (written by setup: mode and `TEMPLATE_FEATURES`), auth mode, invitations, Sentry privacy baseline.        |
| `packages/auth`, `auth-ui`, `onboarding`               | Better Auth server config, route guards for both routers, onboarding plugin.                                                                                |
| `packages/db`                                          | Drizzle schema (`src/schema`) and migrations (`drizzle/`).                                                                                                  |
| `packages/email`, `email-templates`, `storage`, `logs` | ZeptoMail client, React Email templates, R2 client, redacting logger.                                                                                       |
| `scripts/`                                             | Setup, doctor, dev, secrets, db, deploy helpers. Shared logic in `scripts/lib/`.                                                                            |
| `tests/`                                               | Bun tests for everything above, including setup, hooks, DB, server runtime and deploy simulation.                                                           |

A feature that both frontends need is written twice, once per app, following each app's own style (TanStack files use single quotes and no semicolons). Reuse a `packages/*` module before adding an abstraction; add shared logic there when both apps or the API need it.

## Conventions

- Import groups carry `// ** import <category>` headers (types, core packages, lib, utils, components, config, routes, styles), separated by a blank line.
- Frontend HTTP calls go through `src/config/axios.ts` and live in `src/rest-api/<domain>/<action>.ts`; components import those functions, never axios directly.
- API routes validate input with `@hono/zod-validator` and return `{ error }` JSON with a correct status. Unexpected errors bubble to `app.onError`, which logs with the request ID and reports to Sentry; route handlers return messages that are safe to show users.
- Storage paths are owned by user or organization prefixes (`apps/server/src/routes/storage/validation.ts`); check `ownsPath` on every storage route.
- Log with `@repo/logs` (`logger.info(msg, fields)`), never raw request bodies, tokens or cookies. Field names like `password`, `token`, `cookie` are redacted automatically.
- Optional integrations are gated by `TEMPLATE_FEATURES` (`storage`, `email`, `googleAuth`) on both API and frontends.

## Authentication and authorization

Better Auth is configured once in `packages/auth/src/auth.ts` and mounted at `/api/auth/*`. Protect API routes with `authMiddleware` + `requireAuth` (`apps/server/src/middleware`); in organization mode, access to organization data requires a current membership check against the `member` table, as the storage middleware does. Protect pages with the guards in `@repo/auth-ui/guards/*`. Decide personal-vs-organization behaviour with `isOrganizationMode()` from `@repo/config`, never by reading `preset.ts` directly. Read [docs/auth](docs/auth/README.md) before changing invitations, onboarding or email verification.

## Database

Change the schema in `packages/db/src/schema`, then `bun run --cwd packages/db db:generate` to create a migration, then `bun run db:migrate`. Migration files and `drizzle/meta` are history: add new ones, never edit or delete existing ones. Both account models share one schema. `db:push` is for throwaway development databases only and is blocked for any other target. See [docs/getting-started/database.md](docs/getting-started/database.md).

## Secrets

Agents work with development secrets only.

- Use `bun run dev`, `bun run dev:secrets` and `bun run db:migrate:secrets`; they inject development secrets from Infisical into the child process. Sandbox, beta and production secrets are refused in agent sessions by design.
- Leave `.env*` files, `~/.infisical`, `gcp-service-account.json` and any credential unread and uncommitted. When a task seems to need a credential, stop and ask the human.
- Confidential values stay server-side. Only public values get the `VITE_` prefix, because Vite inlines `VITE_*` into browser bundles.
- Declare every new environment variable in `scripts/lib/env-manifest.mjs` (and the relevant `.env.example`); doctor, setup, secret validation and deploy preflight read that list.

Details: [docs/advanced/secrets-infisical.md](docs/advanced/secrets-infisical.md).

## Verifying work

Run before handing work back, and report real results:

```sh
bun run lint && bun run check-types && bun run test && bun run build
```

Add or update tests in `tests/` for new behaviour (`tests/e2e-api.test.ts` for
HTTP-level flows). Tests use embedded PostgreSQL (PGlite), a local mail catcher
and fake CLIs; they never contact real services. User-facing flow changes also
need `bun run test:e2e` (Playwright). Changes to setup, presets or a frontend
need `bun run verify:presets` (slow: one full copy per preset). `bun run doctor`
explains environment problems.

## Workflow

Branch from `dev`, open a PR to `dev`, and release through a reviewed PR from `dev` to `main`. Commit messages follow `type: summary` (`feat:`, `fix:`, `docs:`, `style:`, `chore:`). The pre-commit hook scans for secrets and lints and formats staged files; fix what it reports rather than bypassing it. Deployments run only through the `Deploy API` GitHub workflow.
