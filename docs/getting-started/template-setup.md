# Choose your FlowStack starter

Use Node.js 24 LTS and Bun 1.3.14. Bun installs dependencies and builds the API;
the API itself runs on Node.js.

```sh
git clone --branch dev https://github.com/jacksonkasi1/FlowStack.git my-app
cd my-app
bun run setup
```

Setup first checks Node.js and Bun, then asks for:

1. **Project name**: lowercase letters, digits and hyphens. Used for the package
   name, page titles, email sender name and Cloud Run service names.
2. **Personal or Organization** account model.
3. **React + React Router or TanStack Start** frontend.
4. **Optional integrations**: email (ZeptoMail), file storage (Cloudflare R2),
   Google sign-in, Sentry, Infisical. Authentication and the database are always
   included. A disabled integration hides its UI and drops its required variables
   (e.g. without storage, avatar upload is hidden and R2 credentials are not required).
5. **Infisical project ID**, if Infisical was selected.
6. **Ports**, only when the default API (8080) or frontend (3000) port is in use.

It then installs dependencies and checks the development environment
(`scripts/onboard.mjs`):

| Step       | What happens                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets    | Local mode: every required name in `apps/server/.env` is set and not a placeholder. Infisical mode: offers `infisical login` if needed, then confirms the required names exist in the development environment. |
| Database   | Connects with the development `DATABASE_URL`.                                                                                                                                                                  |
| Migrations | Lists pending migrations and applies them **only with consent**: a prompt, or `--migrate` / `--yes`. Never touches non-development databases.                                                                  |
| Doctor     | Runs the full `bun run doctor` report.                                                                                                                                                                         |

When something is missing (for example `.env` still has placeholders), setup
says exactly what to do. **Setup is resumable**: fix the item and run
`bun run setup` again. It offers to reuse your earlier choices, skips finished
work, and continues. Existing credentials are never overwritten.

## Non-interactive

Setup prompts only when `--mode` or `--frontend` is missing and a terminal is
attached. Everything else falls back to the previous run's choices, then defaults.

```sh
bun run setup --mode personal --frontend react
bun run setup --mode organization --frontend tanstack --name acme \
  --with sentry,infisical --without google --infisical-project-id <id> \
  --api-port 8081 --web-port 3001 --no-install
```

| Option                          | Meaning                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| `--mode personal\|organization` | Account model                                                        |
| `--frontend react\|tanstack`    | Frontend                                                             |
| `--name <name>`                 | Project name                                                         |
| `--with` / `--without <list>`   | Enable / disable `email,storage,google,sentry,infisical`             |
| `--api-port`, `--web-port`      | Local ports (1024–65535, different)                                  |
| `--infisical-project-id <id>`   | Infisical project (an identifier, not a secret)                      |
| `--output <dir>`                | Generate a separate copy in an empty directory outside this checkout |
| `--no-install`                  | Skip `bun install` (and the environment checks)                      |
| `--migrate` / `--yes`           | Apply pending development migrations without a prompt                |
| `--skip-checks`                 | Skip the post-install environment checks (CI)                        |

## What setup changes

- `package.json`: name, workspaces (`apps/server`, the chosen frontend,
  `packages/*`) and `dev` scripts.
- `packages/config/src/config/preset.ts`: account model and `TEMPLATE_FEATURES`.
- Frontend port, page titles and Cloud Run service names, **only where the
  FlowStack defaults are still present**, so your edits survive a rerun.
- `.env` files: created from `.env.example` only when missing, with the chosen
  ports filled in. Existing `.env` files are never modified. With Infisical,
  no `apps/server/.env` is created; secrets are injected at runtime.
- `.flowstack.json`: what was chosen and where it came from:

```json
{
  "version": 2,
  "template": "FlowStack",
  "templateVersion": "2.0.0",
  "sourceCommit": "<commit this project was generated from>",
  "projectName": "acme",
  "mode": "organization",
  "frontend": "tanstack",
  "backend": "node",
  "integrations": {
    "email": true,
    "storage": true,
    "google": false,
    "sentry": true,
    "infisical": true
  },
  "ports": { "api": 8080, "web": 3000 },
  "infisical": {
    "projectId": "<id>",
    "secretPath": "/",
    "environments": {
      "development": "dev",
      "sandbox": "sandbox",
      "beta": "beta",
      "production": "prod"
    }
  }
}
```

It never contains secrets. Files written by older FlowStack versions
(`"version": 1`) are read and upgraded in place, keeping their previous behaviour
(Google sign-in shown, storage and email required). Unknown keys you add are kept.

Setup is safe to rerun, for example to switch frontend or enable an integration.
Both frontend source directories are kept; after choosing, you may delete the
unused one (restore it before selecting it again). Do not delete migration files.

## Separate copies

```sh
bun run setup --mode personal --frontend react --output ../my-app
```

Generated copies exclude Git history, dependencies, build output, local `.env`
files, `.infisical.json` and key files, but keep `.env*.example` files. The
destination must be empty and outside the source checkout.

## Next steps

When setup reports **Ready**, run `bun run dev`. See [Quick Start](./quickstart.md),
[Database](./database.md) and [Secrets](../advanced/secrets-infisical.md).

## Personal and organization modes

Personal mode disables organization and onboarding API plugins, membership
session hooks, organization navigation and onboarding redirects. Normal login
and email verification remain active. File access is scoped to the authenticated
user. Organization mode adds onboarding, invitations and member management;
organization storage access requires current membership in the active organization.
Invitation acceptance requires a verified email address matching the invitation.

Both modes retain the same database schema and migration history. Switching the
configuration does not drop tables or migrate existing application data. Switching
an existing production app's ownership model requires a separate data migration.

## Maintaining the template

Shared changes go to `dev`, are validated for both modes and both frontends, and
reach `main` through a reviewed PR. `bun run verify:presets` installs, tests,
type-checks, builds and audits four isolated starter copies without changing the
maintenance checkout. Releases are tagged from `main` ([CI/CD](../advanced/ci-cd.md)).
Existing projects upgrade by following [upgrading.md](../advanced/upgrading.md).
