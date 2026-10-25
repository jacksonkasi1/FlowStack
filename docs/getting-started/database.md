# Database

FlowStack uses PostgreSQL with Drizzle ORM. The schema lives in
`packages/db/src/schema`, and migrations in `packages/db/drizzle`. Both account
models share one schema and one migration history.

## Connection

`DATABASE_URL` is read from, in order: the process environment (Infisical via
`*:secrets` commands), `packages/db/.env`, then `apps/server/.env`, so one local
file is enough.

The API's client (`packages/db/src/client.ts`) picks its driver from the host:
the **Neon serverless HTTP driver** for `*.neon.tech`, and **postgres.js** over
TCP for any other PostgreSQL (local, Docker, Cloud SQL). Override with
`DATABASE_DRIVER=neon|postgres`; size the postgres.js pool with
`DATABASE_POOL_MAX` (default 10). Migration tooling and `db:*` commands work with
any PostgreSQL.

## Commands

| Command                                 | Effect                                                                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run db:status`                     | Lists applied and pending migrations (by content hash). `--check` exits 1 when any are pending.                                                                                                                                       |
| `bun run db:migrate`                    | Applies pending migrations to the development database, then re-checks that none remain. Running it again is a no-op.                                                                                                                 |
| `bun run db:migrate:secrets`            | Same, with the development `DATABASE_URL` from Infisical.                                                                                                                                                                             |
| `bun run db:seed`                       | Development only: creates `dev@example.com` (verified) and, in organization mode, an organization it owns. Prints a generated password once; set `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` to choose. Does nothing if the user exists. |
| `bun run --cwd packages/db db:generate` | Creates a migration from schema changes.                                                                                                                                                                                              |
| `bun run --cwd packages/db db:studio`   | Drizzle Studio.                                                                                                                                                                                                                       |

New project: `bun run doctor` (checks connectivity) → `bun run db:migrate` →
optionally `bun run db:seed`.

## Safeguards

- The target environment is `FLOWSTACK_ENV` (set by the secrets wrapper), or
  `production` when `NODE_ENV=production`, otherwise `development`.
- `db:migrate` refuses production unless it runs in CI with `--allow-production`
  (the deploy workflow), and requires `--confirm-env=<env>` for sandbox and beta.
- `db:seed` runs only against development.
- `drizzle-kit push` and `drop` are blocked for any non-development target
  (`packages/db/drizzle.config.ts`).
- The API never migrates on start-up.
- Connection errors are explained (host not found, refused, authentication,
  missing database, permissions, TLS) without printing the connection string.

## Out-of-order migrations

Drizzle's migrator applies a migration only when its journal timestamp is newer
than the newest one recorded in the database. In this repository's history,
`0003_invitation_created_at` has a later timestamp than `0004_modern_scorpion`
and `0005_awesome_sentinel`. A fresh database applies all of them in one run, so
new projects are unaffected. A database that was migrated up to `0003` by an
older release, and never ran `0004`/`0005`, would have them **silently skipped**
by `drizzle-kit migrate`.

`db:status` and doctor compare content hashes and report such migrations, and
`db:migrate` refuses to run while they exist. To resolve: review the SQL of each
reported migration, apply it manually inside a transaction, then insert its hash
(`sha256` of the `.sql` file, shown by `db:status` logic in `scripts/lib/db.mjs`)
and journal `when` into `drizzle.__drizzle_migrations`. Do this on a backup or
branch first.
