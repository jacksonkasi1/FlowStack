# Unified template upgrade notes

This change combines the personal and organization templates on `dev`. It does
not merge into `main`. Permanent backups preserve the original tips:
`backup/main-2026-09-06` and `backup/organization-v2-2026-09-06`.

## Dependencies

Direct dependencies were checked against npm's latest stable releases on
2026-09-06, and the lockfile was regenerated to refresh compatible transitive
versions. This includes Better Auth 1.7.3, Hono 4.13.7, Zod 4.5.4, React 19.2.8,
Vite 8.2.2 and current TanStack packages. The installed Hono Zod validator is
tested with the actual Zod 4 storage schemas (valid input, malformed input and
numeric coercion). No Zod 3 fallback is necessary.

TypeScript is held at 6.0.3: current typescript-eslint explicitly rejects the
TypeScript 7 API. Node type definitions follow the supported Node 24 runtime.
Bun 1.3.14 is the tested installer/build runtime. These are compatibility choices,
not claims that the highest version number is always suitable.

The only transitive override is esbuild 0.28.2, replacing the vulnerable version
under the deprecated esbuild-kit loader used by Drizzle Kit. Migration generation
is exercised with that override. Unlike PR #9, this change does not globally
replace incompatible major versions of minimatch, AJV, or other transitive APIs.
Run `bun audit` against the lockfile: a clean result reflects the advisory data
available at the time, not a guarantee against undiscovered vulnerabilities.

## Database

Migration 0004 duplicated changes already made by 0002/0003. It now uses
`IF EXISTS`/`IF NOT EXISTS` so all historical migrations work on a fresh database.
Migration 0006 adds the columns required by the already-enabled username plugin
and changes the database's default onboarding flag to false. The organization
plugin sets its own onboarding state; personal users do not need onboarding.

Both presets share the complete schema. No migration drops organization tables.
Apply migrations to a development/staging database and take your normal database
backup before applying them to an existing deployment. Review existing custom
schema changes separately; generated snapshots cannot account for them.

## Sessions and invitations

PR #7 is incorporated and extended: onboarding and invitation mutations refresh
the signed session cookie. The helper can retrieve the token from the signed
request cookie when a plugin does not propagate its session context to the hook.
The onboarding hooks preserve both signup and get-session response payloads.
Guards use a fresh session read when making access decisions, reject lookalike
bypass paths, handle request failures without exposing protected content, and
ignore stale async responses after navigation.

Invitations require a verified matching email address. The onboarding UI sends
actual invitations through Better Auth before completing the invitation step.
Users can skip that optional step and invite members later.

## Storage ownership change

API-generated object keys now use `uploads/users/<userId>/` or
`uploads/organizations/<organizationId>/`. The server determines accessible
prefixes from the authenticated user and current membership; callers cannot list,
download, delete or check arbitrary keys or upload into an unrelated organization.

Existing objects stored under the old `uploads/` or `uploads/<organizationId>/`
layout require an explicit ownership mapping and object-key migration, along with
updates to stored URLs. They are not automatically reassigned or deleted. Public
R2 URLs remain public: do not use a public bucket for private tenant documents.

## Runtime and deployment

The backend now starts through `@hono/node-server`. Development uses tsx; the
production bundle runs on Node 24. The Dockerfile builds with Bun and runs as
the unprivileged Node image user. Existing deployments that assumed a Bun fetch
export must adopt the Node entry point. Supply production environment variables
to the container; `bun run start` locally reads the server's `.env` file.

No production services or registries are deployed by this PR. GitHub cloning and
`bun run setup` are the supported distribution workflow.
