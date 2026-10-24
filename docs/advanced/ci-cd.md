# CI/CD

| Workflow         | Trigger                               | Purpose                                               |
| ---------------- | ------------------------------------- | ----------------------------------------------------- |
| `verify.yml`     | Pull requests, pushes to `dev`/`main` | Quality, security and preset checks                   |
| `deploy.yml`     | Manual (`workflow_dispatch`)          | Deploy, roll back or inspect the API on Cloud Run     |
| `release.yml`    | Tag `vX.Y.Z` on `main`                | GitHub release; the tag must equal `TEMPLATE_VERSION` |
| `dependabot.yml` | Weekly/monthly                        | Dependency update PRs to `dev`                        |

## Verify jobs

- **shared**: frozen install, lint, type checks, all tests (including hook tests
  with gitleaks), env-file parser tests, shellcheck of deploy scripts, `bun audit`.
- **secret-scan**: full-history scan; fails if the scanner cannot install or run.
- **workflows**: actionlint.
- **presets**: personal/organization × React Router/TanStack Start, plus a
  minimal build without email, storage and Google. Each runs setup, type checks,
  tests, a build with sentinel secret values, the bundle leak check, the
  TanStack runtime check and `bun audit`.
- **e2e**: the Playwright browser journey for all four presets against an
  isolated stack (`e2e/stack.mjs`: embedded PostgreSQL, production API build,
  mail catcher, production frontend build).

No job needs cloud credentials or secrets.

## Branch protection (GitHub settings)

Protect `main` (and optionally `dev`): require a pull request with review,
require status checks `shared`, `secret-scan`, `workflows`, and every `presets`
and `e2e` matrix entry, and require branches to be up to date. Restrict the `prod`
environment's deployment branches to `main` and add required reviewers.

## Releases

1. Merge `dev` → `main` through a reviewed PR.
2. Bump `TEMPLATE_VERSION` in `scripts/lib/project-config.mjs` (in that PR).
3. Tag the merge commit `v<version>` and push the tag; `release.yml` publishes
   notes. Generated projects record the version in `.flowstack.json`.
4. Deploy with the _Deploy API_ workflow ([DEPLOYMENT.md](../../apps/server/DEPLOYMENT.md)).

## Dependency updates

Dependabot (chosen over Renovate because it needs no app installation and
supports Bun lockfiles) opens grouped minor/patch PRs and separate major-version
PRs against `dev`. Nothing auto-merges; each PR goes through `verify.yml`.
