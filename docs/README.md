# FlowStack documentation

## Start here

1. [Prerequisites](./getting-started/prerequisites.md)
2. [Quick start](./getting-started/quickstart.md): setup → doctor → migrate → dev
3. [Setup options and presets](./getting-started/template-setup.md)
4. [First steps](./getting-started/first-steps.md)

## Guides

| Topic                                   | Document                                                         |
| --------------------------------------- | ---------------------------------------------------------------- |
| Database, migrations, seed data         | [getting-started/database.md](./getting-started/database.md)     |
| Secrets and Infisical                   | [advanced/secrets-infisical.md](./advanced/secrets-infisical.md) |
| Authentication, invitations, onboarding | [auth/README.md](./auth/README.md)                               |
| Monitoring with Sentry                  | [advanced/sentry.md](./advanced/sentry.md)                       |
| Git hooks and secret scanning           | [advanced/git-hooks.md](./advanced/git-hooks.md)                 |
| CI/CD, branch protection, releases      | [advanced/ci-cd.md](./advanced/ci-cd.md)                         |
| Cloud Run deployment and rollback       | [apps/server/DEPLOYMENT.md](../apps/server/DEPLOYMENT.md)        |
| Upgrading an existing project           | [advanced/upgrading.md](./advanced/upgrading.md)                 |
| Architecture                            | [concepts/architecture.md](./concepts/architecture.md)           |
| Recipes                                 | [examples/README.md](./examples/README.md)                       |
| Quick reference                         | [reference/cheatsheet.md](./reference/cheatsheet.md)             |

## Troubleshooting

Run `bun run doctor` first: it checks tools, configuration, secrets, database,
migrations, ports and integrations, and prints the next action for each failure
(`--json` for machine-readable output). Then see
[auth troubleshooting](./auth/troubleshooting.md) or the
[deployment troubleshooting table](../apps/server/DEPLOYMENT.md#troubleshooting).

## For AI coding agents

Development rules live in [AGENTS.md](../AGENTS.md).
