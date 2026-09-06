# Choose your FlowStack starter

Use Node.js 24 LTS and Bun 1.3.14. Bun installs dependencies and builds the API;
the API itself runs on Node.js. No registry or Vercel deployment is needed to use
this repository as a template.

```sh
git clone --branch dev https://github.com/jacksonkasi1/FlowStack.git my-app
cd my-app
bun run setup
```

Setup asks exactly two questions: **Personal or Organization**, then **React +
React Router or TanStack Start**. The Hono/Node API, database, email and storage
packages are included automatically. Dependencies are installed after selection.

For scripts or CI:

```sh
bun run setup --mode personal --frontend react
bun run setup --mode organization --frontend tanstack
```

To keep a maintenance checkout and produce a separate project:

```sh
bun run setup --mode personal --frontend react --output ../my-app
```

The destination must be empty and outside the source checkout. Generated copies
exclude Git history, installed dependencies, build output and environment files.
Setup copies `.env.example` only when the destination `.env` does not exist.
`--no-install` prepares files without installing packages. Existing `.env` files
are never overwritten. `.flowstack.json` records the originating commit and choices.

## Start the application

1. Configure `apps/server/.env`: database URL, auth secret, frontend origin,
   email provider and R2 credentials. Replace all placeholder values.
2. Set the same database URL in `packages/db/.env`.
3. Configure the selected frontend's `.env` from its example. Its API URL should
   point to `http://localhost:8080` for local development.
4. Run `bun run --cwd packages/db db:migrate` on your development database.
5. Run `bun run dev`. Only the chosen frontend and the Node API start.

The default frontend port is 3000; the API port is 8080. Email preview is separate:
`bun run dev:email`. Run `bun run check-types`, `bun run test`, `bun run lint`,
`bun run build`, and `bun audit` before shipping changes.

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

Setup deliberately retains source files for both frontends so you can rerun it
to change your selection. Only the selected frontend is a workspace. If you want
a smaller clone, you may manually delete `apps/tanstack` after choosing `react`,
or `apps/web` after choosing `tanstack`. Restore that directory before selecting
it again. Shared router adapters and organization modules can remain: disabled
server plugins do not expose endpoints. Do not delete database migration files.

## Maintenance and releases

Maintain shared changes on `dev`, validate both modes and both frontends, and
review the PR before merging into `main`. Backups are permanent historical refs;
never use them for ongoing development. Tag tested releases and include migration
and security-update instructions. Existing customized clones do **not** update
automatically; use `.flowstack.json` to identify their source and apply relevant
release changes. `bun run verify:presets` installs, tests, type-checks, builds and
audits four isolated starter copies without changing the maintenance checkout.

GitHub cloning is the supported distribution path for this release. A published
`bunx create-flowstack` package can wrap the same setup later; no unverified npm
package name or hosted registry is required now.
