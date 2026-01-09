# Deployment Guide

FlowStack supports deployment to **Google Cloud Run** with three environment tiers.

---

## Local Development

```bash
cp apps/server/.env.example apps/server/.env
# Edit .env with your values
bun run dev
```

---

## Cloud Run Deployment

### Setup

1. **Save GCP Service Account JSON:**
   ```bash
   cp your-service-account.json apps/server/gcp-service-account.json
   ```

2. **Create environment files:**
   ```bash
   # For production
   cp apps/server/.env.example apps/server/.env.prod
   nano apps/server/.env.prod

   # For beta
   cp apps/server/.env.example apps/server/.env.beta
   nano apps/server/.env.beta

   # For sandbox
   cp apps/server/.env.example apps/server/.env.sandbox
   nano apps/server/.env.sandbox
   ```

### Deploy

Deploy to any of three environments:

```bash
./apps/server/scripts/deploy.sh prod
./apps/server/scripts/deploy.sh beta
./apps/server/scripts/deploy.sh sandbox
```

### Customize Region & Service Account Path

```bash
GCP_REGION=us-central1 ./apps/server/scripts/deploy.sh prod
GCP_SA_KEY_PATH=./my-sa-key.json ./apps/server/scripts/deploy.sh prod
```

---

## Environment Files

- `.env` — Local development (gitignored)
- `.env.prod` — Production (gitignored)
- `.env.beta` — Beta (gitignored)
- `.env.sandbox` — Sandbox (gitignored)

Use `.env.example` as a template.

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
- Create `.env.prod`, `.env.beta`, or `.env.sandbox` from `.env.example`

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

