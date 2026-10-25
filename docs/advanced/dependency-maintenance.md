# Dependency maintenance

Reviewed on 2026-10-25. `bun audit` reported no known vulnerabilities before
and after the update. These updates combine security hardening and maintenance
fixes; an outdated version alone does not establish a vulnerability.

## Updated dependencies

| Area             | Updated versions                                                                                                                                           | Reason                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Authentication   | Better Auth 1.7.12                                                                                                                                         | JWT algorithm verification, OAuth callback validation and ID-token audience checks.         |
| Database         | Drizzle ORM 0.45.4, Drizzle Kit 0.31.11, Neon serverless 1.2.0                                                                                             | Prepared-query fix, migration-skip warnings and maintained database driver.                 |
| API              | Hono 4.13.14, Node adapter 2.1.5, Zod 4.6.7                                                                                                                | Current compatible request handling and validation fixes.                                   |
| Storage          | AWS S3 client/presigner 3.1156.0, Nano ID 6.0.2                                                                                                            | Keep signing/client dependencies synchronized and refresh compatible fixes.                 |
| Frontend routing | React Router 7.18.4, TanStack Router 1.170.46, Start 1.169.4, router plugin 1.168.48, Query 5.104.5                                                        | Current compatible routing/runtime fixes with corresponding devtools and SSR query updates. |
| Email rendering  | React Email render 2.1.1                                                                                                                                   | Compatible rendering patch; retain the existing template design.                            |
| Tooling          | Vite 8.3.5, React plugin 6.1.2, tsx 4.23.15, Node types 24.19.2, ESLint 10.13.0, typescript-eslint 8.72.0, globals 17.13.0, Prettier 3.9.10, Turbo 2.11.10 | Compatible fixes within the existing toolchain.                                             |

All declarations of the selected dependencies are updated together, including
root test dependencies. Commit `bun.lock` with manifest updates and verify a
frozen-lockfile installation.

## Compatibility decisions

- Pin `@better-fetch/fetch` to 1.3.2, matching Better Auth 1.7.12's exact
  dependency/peer requirement. The onboarding client's exported request hook
  uses its public `RequestContext` type so declaration generation does not leak
  Bun's internal dependency paths.
- Keep Node 24 types aligned with the project's Node 24 runtime.
- Keep TypeScript 6.0.3. TypeScript 7 is a separate major toolchain migration.
- Keep the patched Better Auth UI 3.4.0 and React Email CLI/UI 6.9.3 pair.
  A preview upgrade needs to validate or replace the existing esbuild patch;
  no audit finding currently requires that change.
- Keep React and the visual component libraries at their current locked
  versions for this security and maintenance pass.
- No schema changes or database migrations are part of this update.

## Upstream references

- [Better Auth 1.7.12](https://github.com/better-auth/better-auth/releases/tag/v1.7.12)
- [Drizzle ORM 0.45.4](https://github.com/drizzle-team/drizzle-orm/releases/tag/0.45.4)
- [Drizzle Kit 0.31.11](https://github.com/drizzle-team/drizzle-orm/releases/tag/drizzle-kit%400.31.11)
- [Hono 4.13.14](https://github.com/honojs/hono/releases/tag/v4.13.14)
- [Hono Node server 2.1.5](https://github.com/honojs/node-server/releases/tag/v2.1.5)

## Verification

Run `bun install --frozen-lockfile`, `bun run check:all`, `bun audit`,
`bun run verify:presets`, and browser journeys for both frontend variants.
CI repeats these checks across personal and organization configurations.

Treat a clean audit as the known-advisory result at that time, not a guarantee
that the dependency tree has no undiscovered vulnerabilities.
