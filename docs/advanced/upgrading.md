# Upgrading an existing FlowStack project

Projects generated from FlowStack are independent copies. `.flowstack.json`
records where a project came from (`templateVersion`, `sourceCommit`), and the
upgrade commands use that commit as the merge base.

## Check

```sh
bun run flowstack:upgrade:check          # human-readable impact report
bun run flowstack:upgrade:check --json   # machine-readable
```

The report compares your recorded `sourceCommit` with the newest `v*` release
of the starter (or `--ref <tag|branch|commit>`; `--source <git url or path>` or
`FLOWSTACK_UPSTREAM` for a fork or mirror) and classifies every changed file:

| Classification | Meaning                                                                                              | On apply                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| update         | Template file you have not changed                                                                   | Replaced with the new version                                                                      |
| add            | New template file                                                                                    | Added                                                                                              |
| merge          | You changed it, upstream changed other lines                                                         | Three-way merged (`git merge-file`), only because the merge is clean                               |
| CONFLICT       | You and upstream changed the same lines                                                              | **Not changed.** A proposal with conflict markers is written to `.flowstack-upgrade/<path>.merged` |
| delete         | Removed upstream, unchanged locally                                                                  | Deleted only with `--allow-delete` or an explicit prompt answer                                    |
| kept           | Removed upstream, customised locally                                                                 | Kept                                                                                               |
| review only    | Application-owned (`apps/**` sources, `package.json`, `bun.lock`, `deploy.config.yaml`, `README.md`) | Never changed; review the upstream diff yourself                                                   |

It also lists **new database migrations** (added as files, never executed) and
**dependency changes** (never applied; major-version changes are flagged for
validation). Per-project files (`.flowstack.json`, `preset.ts`, `.env*`) are
ignored.

## Apply

```sh
bun run flowstack:upgrade --dry-run      # preview only
bun run flowstack:upgrade                # preview, then confirm
bun run flowstack:upgrade --yes          # non-interactive (add --allow-delete for deletions)
```

- The working tree must be clean (commit first), so the result is a reviewable
  `git diff`. `--allow-dirty` overrides.
- Every file the upgrade touches is first copied to
  `.flowstack-backup/<timestamp>/` (gitignored), including `.flowstack.json`.
- Without conflicts, `.flowstack.json` moves to the new `templateVersion` and
  `sourceCommit`. With conflicts, the old base is kept and
  `upgradeInProgress` lists them.

Then:

1. Resolve each conflict: merge `.flowstack-upgrade/<path>.merged` into your file.
2. `bun run flowstack:upgrade --mark-resolved` (refuses while conflict markers remain).
3. Apply any listed dependency changes to `package.json`, then `bun install`.
4. `bun run setup` (refreshes generated files with your existing choices),
   `bun run doctor`, `bun run db:status` / `bun run db:migrate` on development,
   and `bun run check:all`.
5. Production migrations run only from the deploy workflow.

If `sourceCommit` is `unknown` or not in the starter's history (very old
projects), every customised template file is reported as a conflict; nothing is
overwritten. Set `sourceCommit` to the starter commit you started from to get
three-way merges.

## Upgrading to 2.0 (from 1.x)

- `.flowstack.json` is upgraded in place by `bun run setup` (schema 2); previous
  behaviour is kept (Google sign-in shown, storage and email required).
- The API works with any PostgreSQL: non-Neon hosts use postgres.js
  (`DATABASE_DRIVER` overrides). Neon hosts are unchanged.
- `packages/db/.env` is optional: `DATABASE_URL` falls back to `apps/server/.env`.
- `apps/server` builds with `NODE_ENV=production`. Earlier builds inlined
  `"development"`, which enabled SQL query logging in production; redeploy.
- Frontend API calls read `VITE_API_BASE_URL` (previously the undocumented
  `VITE_API_URL`, still accepted).
- Deploys tag images by release, verify before routing traffic, and can be
  rolled back. Service account keys still work but are deprecated
  ([DEPLOYMENT.md](../../apps/server/DEPLOYMENT.md#migrating-from-a-service-account-key)).
- Check `bun run db:status` for the [out-of-order migration](../getting-started/database.md#out-of-order-migrations)
  warning if your database predates `0004_modern_scorpion`.
