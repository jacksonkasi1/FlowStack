# FlowStack

A shared SaaS starter with two account models and two frontend choices.
Maintain the foundation once, then configure it when starting a project.

## Quick start

Install Node.js 24 LTS and Bun 1.3.14, then:

```sh
git clone --branch dev https://github.com/jacksonkasi1/FlowStack.git my-app
cd my-app
bun run setup
```

Setup asks only:

1. **Personal or Organization** — individual accounts, or team workspaces with
   onboarding, invitations and membership.
2. **React Router or TanStack Start** — both use React; the backend is Hono on Node.js.

The auth, database, email and storage packages are included automatically. Setup
installs dependencies and creates missing environment files from examples. Fill
in your credentials, run migrations, then start your chosen frontend and API:

```sh
bun run --cwd packages/db db:migrate
bun run dev
```

See [the setup guide](docs/getting-started/template-setup.md) for environment
configuration, optional cleanup and deployment details.

## Separate starter copies

```sh
bun run setup --mode personal --frontend react --output ../my-app
bun run setup --mode organization --frontend tanstack --output ../team-app
```

Generated copies exclude Git history, environment files, dependencies and build
output. The destination must be empty. Omit `--output` to configure the current
clone, or add `--no-install` to prepare files only.

Setup retains source for both frontends and selects one workspace. You may remove
the unselected frontend manually afterward. Personal mode disables organization
and onboarding server plugins and UI. Both presets retain a shared database schema
and migration history. Configuration lives in
`packages/config/src/config/preset.ts`, with auth policy in `auth-mode.ts`.

## Structure

- `apps/web`: React + React Router frontend.
- `apps/tanstack`: TanStack Start frontend.
- `apps/server`: Hono API with a Node.js entry point.
- `packages/auth`, `auth-ui`, `onboarding`: authentication, guards and onboarding.
- `packages/config`, `db`, `email`, `email-templates`, `storage`, `logs`: shared foundation.
- `scripts/setup.mjs`: interactive and scripted setup.
- `tests`: setup, validation, guard and database-backed auth tests.

## Verification and maintenance

```sh
bun run lint
bun run check-types
bun run test
bun run build
bun audit
bun run verify:presets
```

The auth integration suite uses embedded PostgreSQL and a stubbed email transport;
it does not contact your database or send real email. CI checks both account models
with both frontends. See [upgrade notes](docs/advanced/unified-template-upgrade.md)
for dependency compatibility, migrations and the new storage ownership rules.

Development is on `dev`; releases are reviewed through PRs to `main`. Historical
backups are preserved. Existing customized projects do not update automatically:
use their `.flowstack.json` source commit and release notes to apply fixes.

## Documentation

- [Setup and presets](docs/getting-started/template-setup.md)
- [Authentication](docs/auth/README.md)
- [Architecture](docs/concepts/architecture.md)
- [Upgrade notes](docs/advanced/unified-template-upgrade.md)
- [Documentation index](docs/README.md)

## License

MIT
