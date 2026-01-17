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
- **Environment file mapping** via `env_file` field
- Defaults that apply to all environments

### Environment File Mapping

Each environment specifies which `.env` file to use:

```yaml
environments:
  prod:
    env_file: .env.prod # Uses .env.prod for secrets
    service_name: flowstack-server-prod
    memory: 2Gi
```

**Fallback behavior:**

1. If `env_file` specified → Use that file
2. If not specified → Use `.env.<environment-name>`
3. If that doesn't exist → Fall back to `.env`

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

## Adding Custom Environments

You can create environments with **ANY custom name**!

### Example: Personal Testing Environment

**1. Add to `deploy.config.yaml`:**

```yaml
environments:
  jackson-testing: # Custom name!
    env_file: .env.jackson # Points to custom .env file
    service_name: flowstack-server-jackson
    memory: 512Mi
    cpu: "1"
    min_instances: 0
    max_instances: 2
```

**2. Create the env file:**

```bash
cp .env.example .env.jackson
nano .env.jackson
```

**3. Add deploy script to `package.json`:**

```json
"deploy:jackson-testing": "./.deploy/scripts/deploy.sh jackson-testing"
```

**4. Deploy:**

```bash
bun run deploy:jackson-testing
```

The script automatically:

- Reads `deploy.config.yaml` to find `jackson-testing`
- Uses `.env.jackson` as specified in `env_file`
- Deploys with the configured resources

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
