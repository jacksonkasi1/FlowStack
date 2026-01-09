# Deployment Guide

FlowStack supports deployment to **Google Cloud Run** (GCR) with Docker containerization.

---

## Environment Setup

### Three Environment Configurations

1. **Development** (`.env.example`)
   - Local development defaults
   - Use this as a template for local `.env` file

2. **Production** (`apps/server/.env.prod`)
   - Production values
   - Used when deploying to GCR
   - Replace placeholder values with actual credentials

3. **Frontend** (`apps/web/.env.example`)
   - Client-side variables (must start with `VITE_`)
   - API endpoint configuration

---

## Docker Build

The project includes a `Dockerfile` optimized for the monorepo structure:

```bash
docker build -f apps/server/Dockerfile -t flowstack:latest .
```

The Docker image:
- Uses `oven/bun:1` as base
- Installs dependencies via bun
- Builds the server application
- Runs on port 8787

---

## Google Cloud Run Deployment

### Prerequisites

- Google Cloud SDK installed (`gcloud`)
- GCP project created
- Service account with appropriate permissions
- Docker API enabled in GCP

### Automatic Deployment Script

Use the provided deployment script:

```bash
./scripts/deploy-gcr.sh [project-id] [service-name] [region]
```

**Example:**
```bash
./scripts/deploy-gcr.sh flowstack-prod flowstack-server us-central1
```

### Manual Deployment

1. **Set GCP Project**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Build Image**
   ```bash
   gcloud builds submit --config cloudbuild.yaml --substitutions=_IMAGE_NAME=gcr.io/YOUR_PROJECT_ID/flowstack-server
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy flowstack-server \
     --image gcr.io/YOUR_PROJECT_ID/flowstack-server \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --env-vars-file apps/server/.env.prod
   ```

---

## Configuration

Before deployment, update `apps/server/.env.prod` with:

- Database connection strings
- API keys and secrets
- CORS allowed origins
- Any service-specific variables

---

## Local Testing

1. **Build locally:**
   ```bash
   bun install
   bun run build
   ```

2. **Run development server:**
   ```bash
   bun run dev
   ```

3. **Build Docker image locally:**
   ```bash
   docker build -f apps/server/Dockerfile -t flowstack:latest .
   docker run -p 8787:8787 flowstack:latest
   ```

---

## Monitoring

After deployment to Cloud Run:

- View logs: `gcloud run logs read flowstack-server --region us-central1`
- Monitor health: GCP Console → Cloud Run → Service metrics
- Set up alerts in GCP for high error rates or latency

---

## Troubleshooting

**Build fails:**
- Check `bun.lock` is in root directory
- Verify all dependencies are properly listed in `package.json`

**Container won't start:**
- Verify environment variables are set correctly
- Check server listens on port 8787
- Review CloudRun logs for startup errors

**Deployment timeout:**
- Increase `--timeout` in deployment command
- Check application startup time locally first
