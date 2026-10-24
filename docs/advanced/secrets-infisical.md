# Secrets with Infisical

FlowStack injects secrets at runtime with the [Infisical CLI](https://infisical.com/docs/cli/overview).
Secrets exist only in the environment of the process that needs them: no
plaintext secret files are generated, and nothing falls back to another
environment when access fails.

`.env.example` files stay in the repository as documentation of variable
**names**. The full list, with which variables are confidential, required or
tied to an integration, is `scripts/lib/env-manifest.mjs`.

## Environments

| FlowStack environment | Default Infisical slug | Who can use it                                                   |
| --------------------- | ---------------------- | ---------------------------------------------------------------- |
| `development`         | `dev`                  | Every developer, locally and in AI agent sessions                |
| `sandbox`             | `sandbox`              | CI, or an operator with `FLOWSTACK_ALLOW_REMOTE_SECRETS=sandbox` |
| `beta`                | `beta`                 | CI, or an operator with `FLOWSTACK_ALLOW_REMOTE_SECRETS=beta`    |
| `production`          | `prod`                 | CI (the approval-gated deploy workflow)                          |

Infisical creates `dev`, `staging` and `prod` by default; create `sandbox` and
`beta` in the project (Project Settings › Environments), or map to your own slugs
in `.flowstack.json`:

```json
"infisical": {
  "projectId": "<project id>",
  "secretPath": "/",
  "environments": { "development": "dev", "sandbox": "sandbox", "beta": "staging", "production": "prod" }
}
```

The project ID and slugs are identifiers, not credentials, so they are committed.
`INFISICAL_PROJECT_ID` and `INFISICAL_SECRET_PATH` override them per shell.

Non-development secrets are refused whenever an AI coding agent is detected
(`CLAUDECODE`, `CURSOR_AGENT`, `CODEX_SANDBOX`, `GEMINI_CLI`, … or
`FLOWSTACK_AI_AGENT=1`), even in CI and even with the override.

## Onboarding a developer

1. Install the CLI (`brew install infisical/get-cli/infisical`, or see the docs
   for other platforms).
2. Ask a project admin to add you to the Infisical project with a role that can
   read **only** the development environment (see [permissions](#least-privilege-permissions)).
3. `infisical login` (browser sign-in; the session is stored in your OS keychain,
   never in the repository). EU or self-hosted: also set `INFISICAL_DOMAIN`.
4. In the project: `bun run setup --with infisical --infisical-project-id <id>`
   (or answer the setup prompts). Setup then creates no `apps/server/.env`.
5. `bun run secrets:check`: confirms every required name exists in
   development; prints names only.
6. `bun run doctor`, then `bun run dev`.

## Commands

| Command                                                      | What it does                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`                                                | Starts the API and frontend. Uses Infisical development secrets when the project enabled Infisical, otherwise local `.env` files. |
| `bun run dev:secrets`                                        | Always uses Infisical development secrets (troubleshooting).                                                                      |
| `bun run dev:local`                                          | Always uses local `.env` files: the explicit alternative when Infisical is unavailable.                                           |
| `bun run db:migrate:secrets`                                 | Applies migrations with the development `DATABASE_URL` from Infisical.                                                            |
| `bun run secrets:check`                                      | Validates required secret names in development.                                                                                   |
| `node scripts/secrets.mjs run <env> -- <cmd>`                | Runs any command with an environment's secrets (subject to the rules above).                                                      |
| `node scripts/secrets.mjs run development -- bun run doctor` | Full doctor run with secrets loaded (database, auth and integration checks).                                                      |

If Infisical fails (not logged in, no access, network), the command exits
non-zero, says which environment failed, and stops. It never tries `.env` files
or another environment on its own; `dev:local` is a deliberate, separate choice.

## Public and confidential values

- Confidential values (`DATABASE_URL`, `BETTER_AUTH_SECRET`, API keys) are read
  only by the API.
- Frontend values carry the `VITE_` prefix and are **public**: Vite inlines them
  into the browser bundle. Doctor and `secrets:check` fail if a `VITE_` name looks
  confidential (`SECRET`, `TOKEN`, `PASSWORD`, `API_KEY`, `DATABASE_URL`, …).
- CI builds every preset with sentinel secret values and fails if any appears in
  frontend build output (`scripts/check-bundle-secrets.mjs`).
- Turborepo runs in strict environment mode: only the variable patterns listed
  in `turbo.json` reach tasks. `dev` passes server secrets through without
  hashing them; builds hash only `VITE_*` and Sentry release identifiers.
  Source maps are excluded from the build cache.

## Least-privilege permissions

Create Infisical project roles rather than using Admin for day-to-day work:

| Role            | Permissions                                 |
| --------------- | ------------------------------------------- |
| Developer       | Read secrets in `dev` only                  |
| Maintainer      | Read/write `dev` and `sandbox`; read `beta` |
| Release manager | Read/write `beta` and `prod`                |

Machine identities (one per environment and purpose):

| Identity              | Auth method                                                                       | Access       |
| --------------------- | --------------------------------------------------------------------------------- | ------------ |
| `github-deploy-<env>` | OIDC auth, bound to this repository (`repo:OWNER/REPO:environment:<env>` subject) | Read `<env>` |
| `secret-sync-<env>`   | Managed by the Secret Sync                                                        | Read `<env>` |

Prefer OIDC machine identities: there is no client secret to leak or rotate. If a
platform only supports Universal Auth, store the client ID and secret in that
platform's secret store, never in the repository, and log in with
`infisical login --method=universal-auth --plain --silent` to obtain a
short-lived token passed as `INFISICAL_TOKEN`.

## Deployed environments

Cloud Run does not run the Infisical CLI. Use an Infisical **Secret Sync** to Google
Secret Manager per environment, with key names `<env>_<NAME>` (matching
`secret_prefix` in `apps/server/.deploy/deploy.config.yaml`), and set
`secrets_source: secret-manager`. Cloud Run then reads values at runtime. See
[DEPLOYMENT.md](../../apps/server/DEPLOYMENT.md#secrets).

The deploy workflow uses Infisical directly only to run migrations, through an
OIDC machine identity.

## Rotating a secret

1. Create the new value at the provider (database password, API key, …) while
   the old one still works, where the provider allows two at once.
2. Update it in Infisical for one environment at a time, starting with `dev`.
3. Development picks it up on the next `bun run dev`. Deployed environments pick
   it up after the Secret Sync runs **and** a new revision starts: run the deploy
   workflow (a redeploy of the same commit is fine).
4. Verify (`bun run doctor`, `/health/ready`), then revoke the old value at the provider.
5. `BETTER_AUTH_SECRET`: rotating it signs everyone out. Schedule it.
6. Leaked secret: revoke first, then rotate, then purge it from Git history if it
   was committed. Scanners only stop new leaks.

## Verification status

The wrapper's behaviour (injection into the child process only, environment
boundaries, AI-agent refusal, no fallback on authentication failure, name-only
validation) is covered by `tests/secrets.test.ts`, `tests/doctor.test.ts` and
`tests/v2-units.test.ts` using a stub CLI. Live authentication against a real
Infisical project has not been exercised by the template maintainers: run
`bun run secrets:check` after onboarding to confirm access for your project.
