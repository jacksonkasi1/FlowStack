# Prerequisites

| Tool                                                     | Version                                                                      | Needed for                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [Node.js](https://nodejs.org/)                           | 24 LTS or newer                                                              | Runs the API and scripts                                    |
| [Bun](https://bun.sh)                                    | 1.3.14 (pinned in `package.json`)                                            | Installs, builds, tests                                     |
| Git                                                      | any recent                                                                   | Hooks and setup metadata                                    |
| PostgreSQL                                               | [Neon](https://neon.tech) for the running API; any PostgreSQL for migrations | Database ([details](./database.md#connection))              |
| [Infisical CLI](https://infisical.com/docs/cli/overview) | optional                                                                     | Runtime secrets ([guide](../advanced/secrets-infisical.md)) |
| [gitleaks](https://github.com/gitleaks/gitleaks)         | optional, recommended                                                        | Pre-commit secret scanning                                  |
| [gcloud](https://cloud.google.com/sdk)                   | optional                                                                     | Manual Cloud Run deploys                                    |

After setup, `bun run doctor` checks all of these and tells you what is missing.

## 👉 Next: [Quick Start](./quickstart.md)
