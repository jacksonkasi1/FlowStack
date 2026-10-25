# Deployment Guide

The API (`apps/server`) deploys to Google Cloud Run with
`.deploy/scripts/deploy.sh`, normally through the **Deploy API** GitHub workflow
(`.github/workflows/deploy.yml`). Three environments are defined in
`.deploy/deploy.config.yaml`: `sandbox`, `beta` and `prod`.

> **Verification status.** The deploy, verify, promote and rollback logic is
> tested against a fake `gcloud` (`tests/deploy.test.ts`). The GCP-side setup
> below (Workload Identity Federation, IAM, Secret Manager) has not been run
> against a real project by the template maintainers; dry-run it in sandbox first.

## Contents

- [How a deploy works](#how-a-deploy-works)
- [One-time Google Cloud setup](#one-time-google-cloud-setup)
- [Secrets](#secrets)
- [Deploying](#deploying)
- [Rollback runbook](#rollback-runbook)
- [Database migrations](#database-migrations)
- [Configuration reference](#configuration-reference)
- [Custom environments](#custom-environments)
- [Migrating from a service account key](#migrating-from-a-service-account-key)
- [Troubleshooting](#troubleshooting)

## How a deploy works

```
preflight ─▶ build image :<release> ─▶ deploy revision (no traffic, tag r-<release>)
   │                                         │
   │                              health check  <tag-url>/health/ready
   │                                 │ fail                │ pass
   ▼                                 ▼                     ▼
 stop                     traffic unchanged;      move 100% traffic ─▶ (--auto-rollback)
                          report failure          re-check service; restore previous
                                                  revision if unhealthy
```

1. **Preflight** stops before anything is built if: the environment is unknown;
   no gcloud credentials or project are available; required secrets are missing
   or still placeholders; a `production: true` environment is deployed from
   outside CI, or from a tree with uncommitted changes.
2. **Versioned image**: the image tag is the release, which is the commit SHA
   (`FLOWSTACK_RELEASE`). Each revision is labelled `flowstack-release=<release>`, and
   `FLOWSTACK_RELEASE` is set in the container (Sentry release).
3. **Verification before traffic**: for an existing service, the new revision is
   deployed with `--no-traffic` and checked on its tag URL at `/health/ready`
   (which checks the database). A failing revision never serves users.
4. **Promotion** moves 100% of traffic to the verified revision. With
   `--auto-rollback` (default in the workflow) the service URL is checked again
   and traffic returns to the previous revision if it is unhealthy.
5. **Report**: a summary (outcome, release, new/previous/serving revision,
   actor) is printed, written to the GitHub job summary and, with
   `DEPLOY_REPORT_FILE`, saved as a JSON audit record (the workflow uploads it
   as an artifact kept for 400 days, including the run URL).
6. **Failed revisions are marked**: a revision that fails verification (or is
   rolled back automatically) gets a `failed-<release>` traffic tag at 0%
   traffic, so later rollbacks never select it. Nothing is deleted; its logs
   remain available.

The first deploy of a service cannot use `--no-traffic`; it deploys directly and
is then health-checked.

## One-time Google Cloud setup

Run these as a project owner. Replace `PROJECT_ID`, `PROJECT_NUMBER`, `REGION` and
`OWNER/REPO`. Use one GCP project per environment where possible; otherwise the
per-environment `secret_prefix` keeps secrets apart.

```sh
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com --project PROJECT_ID

# Artifact Registry repository (once; the deploy identity then only needs writer).
gcloud artifacts repositories create flowstack --repository-format=docker \
  --location REGION --project PROJECT_ID

# Identities: one to deploy, one the service runs as.
gcloud iam service-accounts create flowstack-deploy --project PROJECT_ID
gcloud iam service-accounts create flowstack-run --project PROJECT_ID
```

### Keyless authentication (Workload Identity Federation)

GitHub Actions exchanges its OIDC token for short-lived Google credentials; no
key file exists anywhere.

```sh
gcloud iam workload-identity-pools create github --location global --project PROJECT_ID
gcloud iam workload-identity-pools providers create-oidc github \
  --location global --workload-identity-pool github --project PROJECT_ID \
  --issuer-uri https://token.actions.githubusercontent.com \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository == 'OWNER/REPO'"

gcloud iam service-accounts add-iam-policy-binding \
  flowstack-deploy@PROJECT_ID.iam.gserviceaccount.com --project PROJECT_ID \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/OWNER/REPO"
```

### Least-privilege roles

| Identity           | Role                                                                   | Why                                                    |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `flowstack-deploy` | `roles/run.developer`                                                  | Deploy revisions, move traffic                         |
|                    | `roles/iam.serviceAccountUser` on `flowstack-run` only                 | Run revisions as the runtime identity                  |
|                    | `roles/cloudbuild.builds.editor`                                       | Submit the image build                                 |
|                    | `roles/artifactregistry.writer` on the `flowstack` repository          | Push images                                            |
|                    | `roles/secretmanager.viewer`                                           | Check that secret **names** exist (cannot read values) |
| `flowstack-run`    | `roles/secretmanager.secretAccessor` on its environment's secrets only | Read secrets at runtime                                |

`--allow-unauthenticated` needs permission to set the service IAM policy, which
`run.developer` lacks. Either grant `roles/run.admin` to the deploy identity, or
have an owner make the service public once
(`gcloud run services add-iam-policy-binding SERVICE --member allUsers --role roles/run.invoker`)
and accept the warning gcloud prints on later deploys.

Set `runtime_service_account: flowstack-run@PROJECT_ID.iam.gserviceaccount.com`
in `deploy.config.yaml`.

### GitHub repository settings

| Setting                                                            | Value                                                                                                                                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variables (Settings › Secrets and variables › Actions › Variables) | `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER` (`projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github`), `GCP_DEPLOY_SERVICE_ACCOUNT` |
| Variables for migrations                                           | `INFISICAL_PROJECT_ID`, `INFISICAL_IDENTITY_ID` (an Infisical machine identity using OIDC auth trusting this repository), optional `INFISICAL_DOMAIN`                                     |
| Environments                                                       | `sandbox`, `beta`, `prod`. On `prod`, add **required reviewers** and restrict deployment branches to `main`.                                                                              |

No secret values are stored in GitHub: both Google Cloud and Infisical use OIDC.

## Secrets

Set `secrets_source` per environment in `deploy.config.yaml`.

### `infisical` (direct runtime fetch, no local secret files)

Keep application values only in Infisical. No Google Secret Manager or Secret
Sync is required in this mode.

1. Create an Infisical machine identity using **GCP ID Token Auth**. Allow only
   the Cloud Run runtime service account's email. Add the identity to your
   Infisical project with read access to the target environment/path only.
   See [Infisical GCP authentication](https://infisical.com/docs/documentation/platform/identities/gcp-auth).
2. Set the target's `secrets_source: infisical` and
   `runtime_service_account: flowstack-run@PROJECT_ID.iam.gserviceaccount.com`
   in `apps/server/.deploy/deploy.config.yaml`. The runtime account needs no
   Secret Manager permissions for this mode.
3. In each GitHub Environment, set `INFISICAL_PROJECT_ID` and
   `INFISICAL_RUNTIME_IDENTITY_ID` (the GCP-auth identity, separate from the
   migration OIDC identity). Optional: `INFISICAL_DOMAIN` (HTTPS origin for
   your region/self-hosted instance), `INFISICAL_SECRET_PATH` (default `/`), and
   `INFISICAL_RUNTIME_ENVIRONMENT` (override the configured slug; defaults to
   `sandbox`, `beta`, or `prod`). These are identifiers, not secret values.
4. Put required application values in the selected Infisical environment/path
   using their original names, such as `DATABASE_URL`, without a `prod_` prefix.
5. Run the deployment workflow. Preflight validates bootstrap configuration
   without reading secrets. The candidate authenticates from inside Cloud Run,
   loads secrets, then starts the API; the readiness check gates promotion.

Do not wrap the local deploy script with production secret injection: credentials
loaded in your shell do not automatically reach Cloud Run. The container uses
its own Google identity, with no stored Infisical credentials. Outbound access
to the configured Infisical host is required. Failed authentication, missing
variables or an unavailable Infisical service stop new instances from starting;
existing instances retain their loaded values. Redeploy after rotating values.

Server variables come from `scripts/lib/env-manifest.mjs`; declare custom server
variables there. Imports and secret references are supported. Public frontend
build variables remain a separate build-time concern. Switching from Secret
Manager clears old secret bindings. Existing env-file and Secret Manager modes
remain available. Direct runtime authentication is covered with simulated
Google metadata and Infisical responses; a real sandbox deployment still needs
verification with your identities and permissions.

### `secret-manager` (optional sync destination)

Each runtime variable `NAME` is read from the Secret Manager secret
`<secret_prefix>NAME` (default prefix `<environment>_`, e.g. `prod_DATABASE_URL`).
Cloud Run resolves values at runtime; they never pass through the deploying
machine, a temporary file or the logs. Preflight lists secret names and fails if
a required one is missing. Required names come from `scripts/lib/env-manifest.mjs`
and the integrations enabled in `.flowstack.json`.

Keep Infisical as the source of truth and sync into Secret Manager with an
Infisical **Secret Sync** (GCP Secret Manager destination) per environment, so
rotation happens in one place. See
[secrets-infisical.md](../../docs/advanced/secrets-infisical.md#deployed-environments).

### `env-file` (legacy, default for compatibility)

Values are read from `apps/server/<env_file>` (e.g. `.env.prod`, gitignored,
created from the matching `.env.*.example`) and written to a mode-600 temporary
file for `gcloud run deploy --env-vars-file`, which is deleted on exit. The
script warns when a `production` environment uses this mode.

The deploy script supports inline comments in `.env` files:

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

- Inline comments require at least one space before `#`.
- `"value#123" # comment` → `value#123`.
- `NODE_ENV`, `PORT`, `ENVIRONMENT` and `FLOWSTACK_RELEASE` are set by the script.

## Deploying

**From GitHub (normal path):** Actions › _Deploy API_ › _Run workflow_, choose the
environment and action (`deploy`, `rollback`, `status`). Production waits for an
approver. The job runs lint, type checks and tests before deploying.

**From a workstation (sandbox/beta, or emergencies):**

```sh
gcloud auth login && gcloud config set project PROJECT_ID
apps/server/.deploy/scripts/deploy.sh sandbox --dry-run   # preflight + planned commands
bun run --cwd apps/server deploy:sandbox                    # deploy
apps/server/.deploy/scripts/deploy.sh sandbox status        # serving revision + recent revisions
```

Environments with `production: true` refuse local deploys unless
`FLOWSTACK_ALLOW_LOCAL_PRODUCTION_DEPLOY=1` is set for an emergency.

Overrides: `GCP_REGION`, `PROJECT_ID`, `FLOWSTACK_RELEASE`,
`DEPLOY_HEALTH_PATH` (default `/health/ready`), `DEPLOY_HEALTH_ATTEMPTS` (6),
`DEPLOY_HEALTH_INTERVAL` (10 s).

## Rollback runbook

Rollback moves **traffic** between existing revisions. It never touches the database.

1. **Confirm the problem.** `deploy.sh <env> status` shows the serving revision.
   Check errors in Sentry and `gcloud run services logs read SERVICE --region REGION`.
2. **Check schema compatibility.** If the bad release ran migrations, the older
   revision must work with the new schema. Migrations in this project are
   additive by convention; if one was destructive, roll forward with a fix
   instead.
3. **Roll back.** Run the _Deploy API_ workflow with action `rollback` (or
   `deploy.sh <env> rollback`). Without a revision name it picks the newest
   earlier revision deployed by this script that is Ready. To choose one:
   `deploy.sh <env> rollback SERVICE-00042-abc`.
4. **Verification is automatic.** The service URL is health-checked after the
   switch. If the target is unhealthy too, traffic returns to where it was and
   the run fails (`outcome: rollback-failed`); escalate.
5. **Record it.** The job summary lists release, revisions and actor. Open an
   issue linking the failed release, then fix forward on `dev`.

Failed verifications need no rollback: the candidate never received traffic
(`outcome: failed-verification`). Fix the cause and deploy again; the candidate
revision can stay (it serves nothing) or be deleted with
`gcloud run revisions delete`.

To practise safely, deploy a deliberately broken commit to **sandbox** (e.g.
point `secret_prefix` at a database secret for an unreachable host) and watch it
fail verification, then run a rollback there.

## Rate limiting behind a load balancer

Better Auth rate-limits sign-in and other auth routes per client IP. Google's
external Application Load Balancer sends
`X-Forwarded-For: <client-ip>,<load-balancer-ip>`, and Better Auth only trusts a
multi-hop chain when it knows which hops are proxies. Without that, every client
shares **one** bucket, so a few failed sign-ins from anyone would rate-limit all
users.

Set `AUTH_TRUSTED_PROXIES` (comma-separated IPs or CIDRs) to your load
balancer's forwarding-rule IP (`gcloud compute forwarding-rules list`). Better
Auth then walks the chain right to left, skips trusted hops, and uses the first
untrusted address, so a forged left-most value cannot escape a limit
(`tests/e2e-api.test.ts`, "rate limiting behind a proxy"). If a different proxy
sets a dedicated header, `AUTH_IP_HEADERS` lists header names to read instead.
Deploy preflight warns while `AUTH_TRUSTED_PROXIES` is unset. Before relying on a
value, confirm what your service receives (log the header in sandbox), because
proxy chains differ between setups.

## Database migrations

Deploys never migrate automatically. The workflow input **Apply database
migrations** runs `bun run db:migrate` with that environment's credentials from
Infisical (OIDC machine identity) before the new revision is built. Production
requires CI plus `--allow-production`; beta and sandbox require
`--confirm-env=<env>`. Migrations are not reverted by rollbacks.

## Configuration reference

`.deploy/deploy.config.yaml` holds infrastructure settings only; no secrets.

| Key                                                                         | Default                    | Meaning                                                          |
| --------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `region`                                                                    | `us-central1`              | Cloud Run region (`GCP_REGION` overrides)                        |
| `artifact_registry`                                                         | `flowstack`                | Artifact Registry repository                                     |
| `service_name`                                                              | `flowstack-server-<env>`   | Cloud Run service (setup renames it to `<project>-server-<env>`) |
| `memory`, `cpu`, `min_instances`, `max_instances`, `concurrency`, `timeout` | per environment            | Sizing                                                           |
| `allow_unauthenticated`                                                     | `true`                     | Public service                                                   |
| `secrets_source`                                                            | `env-file`                 | `env-file` or `secret-manager`                                   |
| `secret_prefix`                                                             | `<env>_`                   | Secret Manager name prefix                                       |
| `runtime_service_account`                                                   | none                       | Identity the service runs as                                     |
| `production`                                                                | `false`                    | CI-only, clean-tree deploys                                      |
| `env_file`                                                                  | `.env.<env>`               | File for `env-file` mode                                         |
| `service_account_key`                                                       | `gcp-service-account.json` | Legacy key file, used only if present                            |

Current sizing: prod 2 CPU / 2Gi / 1–10 instances / concurrency 80; beta 1 CPU /
1Gi / 0–5 / 80; sandbox 1 CPU / 512Mi / 0–2 / 40.

## Custom environments

Add a block under `environments:` with at least `service_name`, add a
`deploy:<name>` script to `apps/server/package.json`, and (for the workflow) add
the name to the `environment` options in `.github/workflows/deploy.yml` plus a
GitHub Environment of the same name.

```yaml
jackson-testing:
  env_file: .env.jackson
  service_name: flowstack-server-jackson
  memory: 512Mi
  cpu: "1"
  min_instances: 0
  max_instances: 2
  concurrency: 40
```

## Migrating from a service account key

The script still uses `apps/server/gcp-service-account.json` (or `GCP_SA_KEY_PATH`)
when present, with a warning. To move to keyless:

1. Complete [keyless authentication](#keyless-authentication-workload-identity-federation)
   and the GitHub variables.
2. Run the workflow against sandbox (action `status`, then `deploy`).
3. Delete the local key file, then delete the key in IAM
   (`gcloud iam service-accounts keys delete KEY_ID --iam-account ...`).
4. Switch each environment to `secrets_source: secret-manager` once its secrets
   exist in Secret Manager.

## Troubleshooting

| Symptom                             | Fix                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `No active gcloud credentials`      | `gcloud auth login` locally; in CI check the WIF variables and `id-token: write`              |
| `missing Secret Manager secrets`    | Create or sync the listed names; check `secret_prefix`                                        |
| `still has the example placeholder` | Replace the value in the env file (or Infisical)                                              |
| `failed-verification`               | Check `/health/ready` locally and the revision logs; usually `DATABASE_URL` or network access |
| `Setting IAM policy failed` warning | See the `--allow-unauthenticated` note under least-privilege roles                            |
| Build fails in Cloud Build          | `gcloud builds list --region REGION`; `.gcloudignore` controls what is uploaded               |
