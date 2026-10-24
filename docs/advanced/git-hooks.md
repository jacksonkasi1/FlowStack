# Git hooks and secret scanning

`bun install` installs [Husky](https://typicode.github.io/husky/) hooks (the
`prepare` script). The pre-commit hook (`.husky/pre-commit`) runs:

1. **Secret scan of staged changes** (`node scripts/secrets-scan.mjs --staged`)
   with [gitleaks](https://github.com/gitleaks/gitleaks) or, if that is missing,
   the Infisical CLI's scanner. Findings are redacted and block the commit.
2. **lint-staged** (`.lintstagedrc.mjs`): ESLint (no warnings allowed) and
   Prettier on staged files only. Unstaged edits in the same files are stashed
   and restored, and other files are not touched. Generated files are listed in
   `.prettierignore`.

Install gitleaks for the hook: `brew install gitleaks` (macOS) or a release
binary. Without a scanner, the hook prints **SECRET SCAN SKIPPED** and allows the
commit; set `FLOWSTACK_REQUIRE_SECRET_SCAN=1` to make that a failure locally. A
skipped scan is never reported as a pass.

## Full scans and CI

`bun run secrets:scan` scans the entire Git history with `.gitleaks.toml` and the
working tree with `.gitleaks.worktree.toml` (which skips only gitignored
dependencies, build output and local `.env` files). CI runs the same full scan
on every push and pull request, installing a pinned, checksum-verified gitleaks;
if installation or the scan fails, the job fails.

## False positives

Allow the exact value, never a file. In `.gitleaks.toml`, add a regex that
matches only the detected secret (the default `regexTarget`), as the existing
entry for the documented `PASSWORD='my#pass#word'` example does. A different
value on the same line is still reported.

## If a secret was committed

Treat it as leaked even if the commit never left your machine: revoke and rotate
it ([rotation](secrets-infisical.md#rotating-a-secret)), then rewrite history if
it was pushed. Do not bypass the hook with `--no-verify`.

## Tests

`tests/hooks.test.ts` runs the real hook in a temporary repository: a clean
commit passes, a commit with a credential-shaped token is blocked, formatting
applies only to staged content, and lint errors block the commit.
