# Upgrading an existing FlowStack project

Projects generated from FlowStack are independent copies; starter improvements
do not arrive automatically. `.flowstack.json` records where a project came from
(`templateVersion`, `sourceCommit`), which makes upgrades reviewable.

## Procedure

1. Read the release notes for every version after your `templateVersion`
   (GitHub releases), including migration and security notes.
2. Fetch the starter and diff the range you need, limited to shared areas:

   ```sh
   git remote add flowstack https://github.com/jacksonkasi1/FlowStack.git
   git fetch flowstack --tags
   git diff <sourceCommit> flowstack/main --stat -- scripts packages .github turbo.json
   ```

3. Apply changes in small commits on a branch, starting with `scripts/`, CI and
   `packages/*`. Re-apply your customisations where the starter changed the same
   lines; never take whole-file replacements of application code.
4. New database migrations: copy the new files from `packages/db/drizzle` (never
   edit existing ones), then `bun run db:status` and `bun run db:migrate` on
   development. Production migrations run only from the deploy workflow.
5. Rerun `bun run setup` with your existing choices to refresh generated files,
   then `bun run doctor` and the full check suite.
6. Update `templateVersion` and `sourceCommit` in `.flowstack.json`.

## Upgrading to 2.0 (from 1.x)

- `.flowstack.json` is upgraded in place by `bun run setup` (schema 2); previous
  behaviour is kept (Google sign-in shown, storage and email required).
- New scripts: `doctor`, `dev:local`, `dev:secrets`, `db:status`, `db:migrate`,
  `db:migrate:secrets`, `db:seed`, `secrets:check`, `secrets:scan`, `sentry:verify`.
  `bun run dev` now goes through `scripts/dev.mjs`.
- The API now works with any PostgreSQL: non-Neon hosts use postgres.js
  (`DATABASE_DRIVER` overrides). Neon hosts are unchanged.
- `packages/db/.env` is optional: `DATABASE_URL` falls back to `apps/server/.env`.
- `apps/server` builds with `NODE_ENV=production`. Earlier builds inlined
  `"development"`, which enabled SQL query logging in production; redeploy.
- Frontend API calls read `VITE_API_BASE_URL` (previously the undocumented
  `VITE_API_URL`, still accepted).
- Deploys: images are tagged by release, verified before receiving traffic, and
  can be rolled back. Service account keys still work but are deprecated
  ([DEPLOYMENT.md](../../apps/server/DEPLOYMENT.md#migrating-from-a-service-account-key)).
- Check `bun run db:status` for the [out-of-order migration](../getting-started/database.md#out-of-order-migrations)
  warning if your database predates `0004_modern_scorpion`.
