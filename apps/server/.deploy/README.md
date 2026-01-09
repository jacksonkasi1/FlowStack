# FlowStack Deployment

This folder contains all deployment-related configuration and scripts.

## Structure

```
.deploy/
├── deploy.config.yaml    # Deployment infrastructure configuration
├── scripts/
│   └── deploy.sh        # Main deployment script
└── README.md            # This file
```

## Configuration

**`deploy.config.yaml`** - Infrastructure settings (safe to commit)
- GCP region, memory, CPU, scaling settings
- Environment-specific configurations
- Defaults that apply to all environments

## Usage

From `apps/server/`:

```bash
# Using npm scripts (recommended)
bun run deploy:prod
bun run deploy:beta
bun run deploy:sandbox

# Direct script execution
./.deploy/scripts/deploy.sh prod
```

## Adding New Environments

Edit `deploy.config.yaml` and add a new environment:

```yaml
environments:
  staging:
    service_name: flowstack-server-staging
    memory: 1Gi
    cpu: "1"
    # inherits defaults for other settings
```

Then deploy: `bun run deploy:staging`

## Environment Variables Override

Environment variables take precedence over config file:

```bash
GCP_REGION=us-west1 bun run deploy:prod
PROJECT_ID=my-project bun run deploy:prod
GCP_SA_KEY_PATH=./custom-key.json bun run deploy:prod
```

## Security

- **Config file**: Infrastructure settings only (safe to commit)
- **Service account JSON**: Placed in `apps/server/` (gitignored)
- **Application secrets**: Go in `.env.prod`, `.env.beta`, etc. (gitignored)
