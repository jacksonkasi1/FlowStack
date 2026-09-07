# Template verification — 2026-09-06

The maintained source was checked with Node 24.16.0 and Bun 1.3.14 on macOS.
Initial checks used an embedded database. A follow-up browser run used a real Neon
branch copied from the existing database, as described below. No production data,
external mail delivery, storage bucket, or OAuth account was modified.

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

The shared suite contains 14 tests and 97 assertions covering:

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
- Invitation context lookup, expired links, recipient tampering, configurable
  onboarding bypass, and multi-organization creation permissions with the flag off/on.

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

## Live Neon browser verification

The production Node API bundle and both production frontend builds were run
against a dedicated Neon branch, `dev-template-browser-2026-09-06`. The source
database was inspected read-only and left unchanged. Connections and the auth
secret were saved only in ignored local environment files.

The existing database had schema changes beyond its single recorded migration.
On the test branch only, the missing `username` and `display_username` columns,
username uniqueness, and the updated onboarding default were applied. This was
an explicitly inspected schema adjustment, not a successful replay of the old
migration journal. Existing installations with the same drift must reconcile
their migration history before running the normal migration command.

The real application email transport sent to a local HTTP mail capture through
`ZEPTO_URL`; no messages went to an external mail provider. Generated verification
and invitation links were opened in isolated browser sessions. Better Auth uses
signed email-verification tokens, so these links were captured from rendered
emails rather than extracted from the database or replaced by direct updates to
the user's verification flag.

Observed results:

- Two React signup sessions created separate organizations. Sending an invitation
  and skipping invitations both completed onboarding.
- Verification links marked both owners verified in Neon and reached the dashboard.
- Each owner listed only their organization. Attempts to read the other tenant's
  members or organization, activate it, list its files, or request a download URL
  returned 403. The original active organization stayed unchanged.
- Missing required storage query parameters returned 400 through Hono/Zod 4.
- A third account verified its email and accepted the generated invitation in the
  browser. Neon confirmed its member role and completed onboarding state.
- A member's attempt to promote itself returned 403. Removing the only owner was
  rejected with Better Auth's 400 ownership-invariant error.
- The owner removed the synthetic member through the members page. A subsequent
  request from the removed member's existing session immediately returned 403.
- TanStack login and the members page worked against the same live API/database.
  No browser runtime errors were reported in the four browser sessions.

The test branch is retained for inspection. It contains synthetic `example.com`
accounts and organizations; no Git backup branch was removed or changed.

The revised Vite invitation page was also checked against Neon: a new recipient
received the signup form directly, its email input was read-only, and no sign-in
choice was displayed. Signup stayed on the invitation verification screen. After
opening a captured verification link, accepting the invitation reached the dashboard.
Neon confirmed member access and `should_onboard=false`. An existing account
received the sign-in form. The old organization-onboarding URL redirected an
invited user back to their pending invitation.
With multi-organization creation temporarily enabled in the local server and Vite
environments, the Organizations menu appeared and the browser created a second
organization. Neon confirmed both memberships and the new owner role. The local
configuration was then restored to its default disabled state.

The follow-up recursive dependency check found only two intentional major-version
holds: TypeScript 6.0.3 for the current ESLint integration, and Node 24 type
definitions to match the supported Node 24 runtime. All other direct dependencies
matched the registry's latest releases. `bun audit` reported no known vulnerabilities.

## Remaining live-environment checks

Google OAuth, actual ZeptoMail delivery, actual R2 signing/upload/download, and
Docker deployment require real service configuration and were not exercised
against external services. Before upgrading an existing app, validate its custom
schema/data and migrate any legacy storage keys as described in the upgrade notes.
The GitHub workflow repeats shared checks and the four-preset matrix on Linux.
