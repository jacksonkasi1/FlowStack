# FlowStack deployment files

- `deploy.config.yaml`: per-environment Cloud Run settings (no secrets).
- `scripts/deploy.sh`: preflight, versioned build, verified deploy, rollback, status.
- `scripts/test_env_parsing.sh`: regression tests for the env-file parser.

Usage, setup and the rollback runbook are in [../DEPLOYMENT.md](../DEPLOYMENT.md).
