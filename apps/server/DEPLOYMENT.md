# Deployment Guide

FlowStack supports deployment to **Google Cloud Run** with three environment tiers.

All deployment configuration is centralized in the `.deploy/` folder.

---

## Table of Contents

- [File Architecture](#file-architecture)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Cloud Run Deployment](#cloud-run-deployment)
- [Deployment Configuration](#deployment-configuration)
- [Adding Custom Environments](#adding-custom-environments)
- [Troubleshooting](#troubleshooting)

---

## File Architecture

### Server Deployment Structure

```
apps/server/
├── .deploy/                          # 📁 All deployment-related files
│   ├── deploy.config.yaml           # 🔧 Infrastructure configuration (COMMITTED)
│   ├── scripts/
│   │   └── deploy.sh                # 🚀 Deployment script with YAML parser
│   └── README.md                    # 📖 Deployment usage guide
│
├── .env.example                     # 📄 Local development template (COMMITTED)
├── .env.prod.example                # 📄 Production template (COMMITTED)
├── .env.beta.example                # 📄 Beta template (COMMITTED)
├── .env.sandbox.example             # 📄 Sandbox template (COMMITTED)
│
├── .env                             # 🔒 Local secrets (GITIGNORED)
├── .env.prod                        # 🔒 Production secrets (GITIGNORED)
├── .env.beta                        # 🔒 Beta secrets (GITIGNORED)
├── .env.sandbox                     # 🔒 Sandbox secrets (GITIGNORED)
│
├── gcp-service-account.json         # 🔑 GCP credentials (GITIGNORED)
│
├── src/                             # 💻 Application source code
├── Dockerfile                       # 🐳 Docker build configuration
├── package.json                     # 📦 Dependencies & deploy scripts
├── tsconfig.json                    # ⚙️ TypeScript configuration
└── DEPLOYMENT.md                    # 📚 This file

Root Level:
├── cloudbuild.yaml                  # ☁️ Google Cloud Build config
└── turbo.json                       # ⚡ Turborepo configuration
```

### Key Files Explained

| File | Purpose | Committed? |
|------|---------|-----------|
| `.deploy/deploy.config.yaml` | Infrastructure settings (region, memory, CPU, scaling) | ✅ Yes |
| `.deploy/scripts/deploy.sh` | Deployment script with YAML parser | ✅ Yes |
| `.env.*.example` | Environment variable templates | ✅ Yes |
| `.env`, `.env.prod`, `.env.beta`, `.env.sandbox` | Actual secrets and API keys | ❌ No (gitignored) |
| `gcp-service-account.json` | GCP authentication credentials | ❌ No (gitignored) |
| `Dockerfile` | Container build instructions | ✅ Yes |
| `cloudbuild.yaml` | Cloud Build configuration | ✅ Yes |
| `package.json` | Deploy scripts (`deploy:prod`, etc.) | ✅ Yes |

### Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  COMMITTED (Safe to version control)                        │
├─────────────────────────────────────────────────────────────┤
│  • .deploy/deploy.config.yaml  - Infrastructure settings    │
│  • .env.*.example              - Templates                  │
│  • deploy.sh                   - Deployment script          │
│  • Dockerfile                  - Build config               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  GITIGNORED (Never commit)                                  │
├─────────────────────────────────────────────────────────────┤
│  • .env, .env.prod, etc.       - Actual secrets            │
│  • gcp-service-account.json    - GCP credentials           │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before deploying to Google Cloud Run, ensure you have:

### Required Tools

1. **Bun** (v1.2.22 or higher)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Google Cloud SDK (gcloud)**
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

3. **Docker** (for local testing - optional)
   ```bash
   # macOS
   brew install docker
   ```

### Required GCP Setup

1. **Google Cloud Project**
   - Create a project at: https://console.cloud.google.com
   - Note your Project ID

2. **Enable Required APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

3. **Service Account with Permissions**

   Create a service account with these roles:
   - `Cloud Run Admin`
   - `Cloud Build Editor`
   - `Artifact Registry Administrator`
   - `Service Account User`

   ```bash
   # Create service account
   gcloud iam service-accounts create flowstack-deployer \
     --display-name="FlowStack Deployer"

   # Grant roles
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:flowstack-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   # Repeat for other roles...

   # Download JSON key
   gcloud iam service-accounts keys create gcp-service-account.json \
     --iam-account=flowstack-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Move Service Account Key**
   ```bash
   mv gcp-service-account.json apps/server/
   ```

### Required Environment Files

Create environment-specific `.env` files from templates:

```bash
cd apps/server

# For production
cp .env.prod.example .env.prod
nano .env.prod  # Add your production secrets

# For beta
cp .env.beta.example .env.beta
nano .env.beta

# For sandbox
cp .env.sandbox.example .env.sandbox
nano .env.sandbox
```

### Verify Prerequisites

Check that everything is installed:

```bash
# Check bun
bun --version

# Check gcloud
gcloud --version

# Check authentication
gcloud auth list

# Check project
gcloud config get-value project

# Check service account file exists
ls -la apps/server/gcp-service-account.json

# Check env files exist
ls -la apps/server/.env.*
```

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

### Environment File Format

The deployment script supports inline comments in `.env` files:

**Supported:**
```bash
# Full-line comments are supported
API_KEY=secret123 # inline comments (space before #)

# Values with # but no space before it are preserved
CALLBACK_URL=http://example.com/#anchor  # OK - no space before first #
TOKEN=abc#123  # OK - # is part of the value

# Quoted values always preserve # characters inside
DATABASE_URL="postgresql://user:pass#123@localhost/db"
PASSWORD='my#pass#word'

# Comments after closing quotes (with space) are stripped
APP_NAME="MyApp" # production app  → parsed as "MyApp"
```

**Comment Detection Rules:**
- Inline comments require **at least one space before #**
- `value # comment` → `value` (comment stripped)
- `value#123` → `value#123` (no space, # preserved)
- `"value#123" # comment` → `value#123` (quoted, then comment stripped)

**Best Practices:**
- Use full-line comments for better readability
- Quote values with `#` if they might have trailing comments
- Ensure space before `#` for inline comments

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
5. Environment variables converted to Cloud Run format (using unique temp file)
6. Service deployed to Cloud Run
7. Service URL returned

### Parallel Deployments

The deployment script supports running multiple deployments in parallel:

```bash
# Deploy to multiple environments simultaneously
bun run deploy:prod & bun run deploy:beta & bun run deploy:sandbox &

# Wait for all deployments to complete
wait

# Or in a single line
bun run deploy:prod & bun run deploy:beta & bun run deploy:sandbox & wait
```

Each deployment:
- Creates a unique temporary file using `mktemp` (no race conditions)
- Authenticates independently
- Can deploy to different regions
- Cleans up automatically on completion or failure

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

