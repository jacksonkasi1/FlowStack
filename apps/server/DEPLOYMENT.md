# Deployment Guide

FlowStack supports deployment to **Google Cloud Run** with three environment tiers.

All deployment configuration is centralized in the `.deploy/` folder.

---

## Local Development

```bash
cd apps/server
cp .env.example .env
# Edit .env with your values
bun run dev
```

Or from root:
```bash
bun --cwd apps/server dev
```

---

## Cloud Run Deployment

### Setup

1. **Save GCP Service Account JSON:**
   ```bash
   cp your-service-account.json apps/server/gcp-service-account.json
   ```

2. **Create environment files from templates:**
   ```bash
   # For production
   cp apps/server/.env.prod.example apps/server/.env.prod
   nano apps/server/.env.prod

   # For beta
   cp apps/server/.env.beta.example apps/server/.env.beta
   nano apps/server/.env.beta

   # For sandbox
   cp apps/server/.env.sandbox.example apps/server/.env.sandbox
   nano apps/server/.env.sandbox
   ```

### Deploy

Deploy to any of three environments using npm scripts:

**From Root (using bun):**
```bash
cd apps/server
bun run deploy:prod
bun run deploy:beta
bun run deploy:sandbox
```

**Direct Script Execution:**
```bash
./apps/server/.deploy/scripts/deploy.sh prod
./apps/server/.deploy/scripts/deploy.sh beta
./apps/server/.deploy/scripts/deploy.sh sandbox
```

### Customize Region & Service Account Path

```bash
GCP_REGION=us-central1 bun run deploy:prod
GCP_SA_KEY_PATH=./my-sa-key.json bun run deploy:prod

# Or with direct script
GCP_REGION=us-central1 ./apps/server/.deploy/scripts/deploy.sh prod
GCP_SA_KEY_PATH=./my-sa-key.json ./apps/server/.deploy/scripts/deploy.sh prod
```

---

## Deployment Configuration

### Configuration File (`/apps/server/.deploy/deploy.config.yaml`)

All deployment infrastructure settings are managed in `.deploy/deploy.config.yaml`:

```yaml
defaults:
  region: us-central1
  artifact_registry: flowstack
  service_account_key: gcp-service-account.json
  timeout: 300

environments:
  prod:
    service_name: flowstack-server-prod
    memory: 2Gi
    cpu: "2"
    min_instances: 1
    # ... more settings
```

**Benefits:**
- ✅ Version controlled (safe to commit)
- ✅ Single source of truth for all environments
- ✅ Easy to compare environment configs
- ✅ Environment variables override config values

**Environment File Mapping:**

Each environment can specify which `.env` file to use via the `env_file` field:

```yaml
environments:
  prod:
    env_file: .env.prod              # Uses .env.prod for secrets
    service_name: flowstack-server-prod
    memory: 2Gi

  staging:
    env_file: .env.staging           # Uses .env.staging for secrets
    service_name: flowstack-server-staging
    memory: 1Gi
```

**Fallback Behavior:**
1. If `env_file` is specified → Use that file
2. If not specified → Use `.env.<environment-name>`
3. If that doesn't exist → Fall back to `.env`

---

## Adding Custom Environments

You can create ANY custom environment with ANY name!

### Example: Personal Testing Environment

**Step 1: Add to `deploy.config.yaml`**

```yaml
environments:
  jackson-testing:                   # Custom name!
    env_file: .env.jackson           # Points to .env.jackson
    service_name: flowstack-server-jackson
    memory: 512Mi
    cpu: "1"
    min_instances: 0
    max_instances: 2
    concurrency: 40
```

**Step 2: Create env file**

```bash
cp apps/server/.env.example apps/server/.env.jackson
nano apps/server/.env.jackson
```

**Step 3: Add deploy script to `package.json`**

```json
{
  "scripts": {
    "deploy:jackson-testing": "./.deploy/scripts/deploy.sh jackson-testing"
  }
}
```

**Step 4: Deploy**

```bash
cd apps/server
bun run deploy:jackson-testing
```

**That's it!** ✅ The deployment script automatically:
- Reads `deploy.config.yaml` to find `jackson-testing` config
- Uses `.env.jackson` file as specified
- Deploys with the configured resources

---

## Multiple Developers / Environments

Each developer can have their own environment:

```yaml
environments:
  dev-john:
    env_file: .env.john
    service_name: flowstack-server-john
    memory: 512Mi

  dev-sarah:
    env_file: .env.sarah
    service_name: flowstack-server-sarah
    memory: 512Mi
```

Then in `package.json`:
```json
"deploy:dev-john": "./.deploy/scripts/deploy.sh dev-john",
"deploy:dev-sarah": "./.deploy/scripts/deploy.sh dev-sarah"
```

---

## Environment Files

### Template Files (Committed)
- `.env.example` — Local development template
- `.env.prod.example` — Production template
- `.env.beta.example` — Beta template
- `.env.sandbox.example` — Sandbox template

### Actual Files (Gitignored - Create from templates)
- `.env` — Local development (copy from `.env.example`)
- `.env.prod` — Production (copy from `.env.prod.example`)
- `.env.beta` — Beta (copy from `.env.beta.example`)
- `.env.sandbox` — Sandbox (copy from `.env.sandbox.example`)

Copy template files and update with your actual values.

---

## Environment-Specific Resources

The deployment script sets different resources based on environment:

### Production
- Memory: 2Gi
- CPU: 2
- Min instances: 1
- Max instances: 10
- Concurrency: 80

### Beta
- Memory: 1Gi
- CPU: 1
- Min instances: 0
- Max instances: 5
- Concurrency: 80

### Sandbox
- Memory: 512Mi
- CPU: 1
- Min instances: 0
- Max instances: 2
- Concurrency: 40

---

## Troubleshooting

**Service account not found**
- Check `gcp-service-account.json` exists or set `GCP_SA_KEY_PATH`

**Environment file not found**
- Create `.env.prod`, `.env.beta`, or `.env.sandbox` from the respective `.example` files:
  - `cp apps/server/.env.prod.example apps/server/.env.prod`
  - `cp apps/server/.env.beta.example apps/server/.env.beta`
  - `cp apps/server/.env.sandbox.example apps/server/.env.sandbox`

**Container failed to start**
- Check Cloud Run logs via deployment output link
- Verify all required environment variables are set

**API key errors**
- Verify all keys in `.env.prod|beta|sandbox` are correct and active
- Check service account has necessary permissions

---

## Deployment Flow

1. Script validates environment file exists
2. Service account authentication
3. Artifact Registry repository created (if not exists)
4. Docker image built and pushed via Cloud Build
5. Environment variables converted to Cloud Run format
6. Service deployed to Cloud Run
7. Service URL returned

---

## Quick Commands Reference

| Task | Command |
|------|---------|
| Local dev | `cd apps/server && bun run dev` |
| Build | `cd apps/server && bun run build` |
| Type check | `cd apps/server && bun run check-types` |
| Deploy prod | `cd apps/server && bun run deploy:prod` |
| Deploy beta | `cd apps/server && bun run deploy:beta` |
| Deploy sandbox | `cd apps/server && bun run deploy:sandbox` |
| Custom region prod | `GCP_REGION=us-west1 bun run deploy:prod` |
| Custom SA key | `GCP_SA_KEY_PATH=./key.json bun run deploy:prod` |

