# Quick Start

> **Prerequisites:** [Prerequisites](./prerequisites.md)

```sh
git clone --branch dev https://github.com/jacksonkasi1/FlowStack.git my-app
cd my-app
bun run setup        # project name, account model, frontend, integrations; installs dependencies
```

Then provide development secrets, either:

- **Local files**: fill in `apps/server/.env` (setup created it from the example;
  every placeholder must be replaced), or
- **Infisical**: add them to the project's `dev` environment, `infisical login`,
  then `bun run secrets:check`. See [secrets-infisical.md](../advanced/secrets-infisical.md).

```sh
bun run doctor       # every check PASS (or SKIPPED for integrations you did not enable)
bun run db:migrate   # or db:migrate:secrets with Infisical
bun run db:seed      # optional: development user dev@example.com
bun run dev          # API on :8080, frontend on :3000 (setup may choose other ports)
```

Open http://localhost:3000 and sign up (or sign in as the seed user).

Non-interactive setup for scripts and CI:

```sh
bun run setup --mode organization --frontend tanstack --name acme --with sentry,infisical \
  --infisical-project-id <id> --no-install
```

All options: `bun run setup --help`. Details: [template-setup.md](./template-setup.md).

## If something fails

Run `bun run doctor`; each failing check names the next action. Common cases:
an `.env` value still holds its example placeholder, the database is not
reachable, or Infisical needs `infisical login`.

## 👉 Next: [First Steps](./first-steps.md)
