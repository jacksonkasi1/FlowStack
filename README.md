# FlowStack

A shared SaaS starter with two account models and two frontend choices.
Maintain the foundation once, then configure it when starting a project.

## Quick start

Install Node.js 24 LTS and Bun 1.3.14, then:

```sh
git clone --branch dev https://github.com/jacksonkasi1/FlowStack.git my-app
cd my-app
bun run setup      # questions, install, then secrets/database/migrations/doctor checks
                   # fill in what it reports, rerun to resume, until "Ready"
bun run dev
```

Secrets come from local `.env` files or, preferably, from
[Infisical](docs/advanced/secrets-infisical.md) at runtime. See the
[quick start](docs/getting-started/quickstart.md) and
[setup options](docs/getting-started/template-setup.md).

## Commands

| Command                                                               | Purpose                                                                                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bun run setup`                                                       | Configure, install and check this checkout (or `--output <dir>` for a new copy); interactive or flags; resumable |
| `bun run doctor`                                                      | Diagnose the environment (`--json` available)                                                                    |
| `bun run dev`                                                         | API + selected frontend (Infisical when enabled, else `.env`)                                                    |
| `bun run dev:secrets` / `dev:local`                                   | Force Infisical / local `.env` files                                                                             |
| `bun run db:status` / `db:migrate` / `db:migrate:secrets` / `db:seed` | Database workflow ([guide](docs/getting-started/database.md))                                                    |
| `bun run secrets:check`                                               | Required secret names present in Infisical development                                                           |
| `bun run secrets:scan`                                                | Secret scan of history and working tree                                                                          |
| `bun run sentry:verify`                                               | Send one test event to your Sentry project                                                                       |
| `bun run lint` / `check-types` / `test` / `build`                     | Quality checks                                                                                                   |
| `bun run check:all`                                                   | Lint, types, tests and build                                                                                     |
| `bun run test:e2e`                                                    | Browser journey (Playwright) against an isolated stack                                                           |
| `bun run verify:presets`                                              | Build and test every preset in isolated copies                                                                   |
| `bun run flowstack:upgrade:check` / `flowstack:upgrade`               | Check for and apply starter upgrades ([guide](docs/advanced/upgrading.md))                                       |

## Structure

- `apps/server`: Hono API on Node.js ([deployment](apps/server/DEPLOYMENT.md)).
- `apps/web`: React + React Router frontend.
- `apps/tanstack`: TanStack Start frontend.
- `packages/auth`, `auth-ui`, `onboarding`: authentication, guards and onboarding.
- `packages/config`, `db`, `email`, `email-templates`, `storage`, `logs`: shared foundation.
- `scripts/`: setup, doctor, dev, secrets, database and deployment tooling.
- `tests/`: unit, integration and API end-to-end tests (`bun run test`).
- `e2e/`: Playwright browser journey (`bun run test:e2e`).

Personal mode disables organization and onboarding features; both modes share one
database schema. Configuration lives in `packages/config/src/config/preset.ts`.

## Quality and security

- Pre-commit hook: secret scan of staged changes, ESLint and Prettier on staged files.
- CI: lint, types, tests, audit, full-history secret scan, workflow lint, and every
  preset built with sentinel secrets and checked for bundle leaks.
- Sentry is optional and configured to collect no cookies, bodies, user details or
  query values ([details](docs/advanced/sentry.md)).
- Deploys are keyless (Workload Identity Federation), verified before receiving
  traffic, and can be rolled back.

Tests use embedded PostgreSQL, stubbed email and fake CLIs; they contact no real
service.

## Development

Work on `dev`; releases go through reviewed PRs to `main` and are tagged
([CI/CD](docs/advanced/ci-cd.md)). Existing projects upgrade by following
[upgrading.md](docs/advanced/upgrading.md), using `.flowstack.json` to identify
their starter version. AI coding agents: see [AGENTS.md](AGENTS.md).

## Documentation

[Documentation index](docs/README.md)

## License

MIT
