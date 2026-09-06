# Template verification — 2026-09-06

The maintained source was checked with Node 24.16.0 and Bun 1.3.14 on macOS.
No production database, mail provider, storage bucket, or OAuth account was used.

## Automated checks

`bun run verify:presets` generated four isolated copies outside the repository.
Each copy passed dependency installation, a subsequent frozen-lockfile install,
workspace type checks, the integration suite, production builds and `bun audit`:

| Account model | Frontend       | Result |
| ------------- | -------------- | ------ |
| Personal      | React Router   | Passed |
| Personal      | TanStack Start | Passed |
| Organization  | React Router   | Passed |
| Organization  | TanStack Start | Passed |

The shared suite contains 12 tests and 82 assertions covering:

- Repeatable setup for all four selections, preservation of existing environment
  files, safe output directories, secret/history exclusion, and invalid arguments.
- Hono's Zod 4 query validation, malformed paths and bounded numeric coercion.
- User/organization storage namespace separation and path-prefix boundaries.
- Personal access decisions, email verification and onboarding redirect decisions.
- Real Better Auth signup, login, logout, password reset and email verification.
- Organization creation, skipping the optional step, rejection of skipping required
  setup and repeated creation, and cookie-cache refresh after onboarding.
- Invitation recipient/verification checks, successful acceptance, refreshed cached
  onboarding state, and rejection of a member attempting to remove the owner.

Database-backed tests apply the entire migration history to an embedded PostgreSQL
engine (PGlite), then use the application's auth configuration and Drizzle adapter.
Only outbound email delivery is stubbed. This caught and corrected fresh-database
migration failures and response/cookie regressions during the upgrade.

Root lint and `git diff --check` also pass. Drizzle migration generation works
with the esbuild security override. `bun audit` reports no known vulnerabilities.

## Interactive checks

The actual setup prompt was run in a terminal and used to create a separate
Personal/TanStack copy. Both questions and the resulting manifest were checked.

Both frontends' production output was opened in a browser. Sign-in and signup
forms rendered without error overlays or reported browser errors. The React
and TanStack frontends completed signup, organization creation and skipping invitations, then
reached the required email-verification page without an onboarding loop. Direct
access to its dashboard while signed out redirected to sign-in. The Node API
production bundle was also started and served unauthenticated session requests.

A standalone TanStack runtime check consumes the complete sign-in HTML response
with a five-second deadline; it completed in about half a second locally. This
check runs in CI for both TanStack presets. Duplicate notification containers in
the TanStack document shell were also removed.

For reproducible local browser testing, start `bun tests/browser-server.ts` and
serve the frontend on port 3100 (React) or 3200 (TanStack). The fixture binds only
to loopback, keeps data in memory and stubs all outbound fetch calls. Never deploy
it. It is separate from the production API entry point.

## Remaining live-environment checks

Google OAuth, actual ZeptoMail delivery, actual R2 signing/upload/download, and
Docker deployment require real service configuration and were not exercised
against external services. Before upgrading an existing app, validate its custom
schema/data and migrate any legacy storage keys as described in the upgrade notes.
The GitHub workflow repeats shared checks and the four-preset matrix on Linux.
