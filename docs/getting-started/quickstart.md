# Quick Start

> **Prerequisites:** [Prerequisites](./prerequisites.md)

```sh
git clone --branch dev https://github.com/jacksonkasi1/FlowStack.git my-app
cd my-app
bun run setup
```

Setup asks a few questions, installs dependencies, then checks secrets, the
database, migrations and the whole environment. The first run usually stops at
**Secrets**, because `apps/server/.env` still holds example placeholders (or,
with Infisical, the development secrets are not there yet). Then:

- **Local files**: fill in `apps/server/.env`, or
- **Infisical**: add the names to the project's `dev` environment
  ([guide](../advanced/secrets-infisical.md)); setup offers `infisical login`.

Run `bun run setup` again. It resumes, asks before applying migrations, runs
doctor, and ends with **Ready**:

```sh
bun run dev          # API on :8080, frontend on :3000 (setup may choose other ports)
bun run db:seed      # optional: development user dev@example.com
```

Open http://localhost:3000 and sign up (or sign in as the seed user).

Non-interactive setup for scripts and CI:

```sh
bun run setup --mode organization --frontend tanstack --name acme --with sentry,infisical \
  --infisical-project-id <id> --migrate
```

All options: `bun run setup --help`. Details: [template-setup.md](./template-setup.md).

## If something fails

Run `bun run doctor`; each failing check names the next action. Common cases:
an `.env` value still holds its example placeholder, the database is not
reachable, or Infisical needs `infisical login`.

## 👉 Next: [First Steps](./first-steps.md)
