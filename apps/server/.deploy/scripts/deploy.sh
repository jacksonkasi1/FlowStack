#!/bin/bash
set -euo pipefail

# ===========================================
# FlowStack Server - GCP Cloud Run Deployment
# ===========================================
# Usage:
#   ./deploy.sh <environment> [--dry-run] [--auto-rollback]
#   ./deploy.sh <environment> rollback [revision] [--dry-run]
#   ./deploy.sh <environment> status
#
# Deploy flow (existing service):
#   preflight -> build image tagged with the release -> deploy a new revision
#   with NO traffic -> health-check it on its tag URL -> move traffic.
#   If the check fails, production traffic never reaches the new revision.
#   --auto-rollback additionally verifies the service after the traffic switch
#   and, if it fails, restores the previously serving revision.
#
# Database migrations are never run or rolled back by this script.
# ===========================================

TEMP_ENV_YAML=""
trap '[ -n "$TEMP_ENV_YAML" ] && rm -f "$TEMP_ENV_YAML"' EXIT

ENV="${1:-}"
shift || true
ACTION="deploy"
ROLLBACK_REVISION=""
DRY_RUN=false
AUTO_ROLLBACK=false
while [ $# -gt 0 ]; do
  case "$1" in
    rollback) ACTION="rollback"; if [ -n "${2:-}" ] && [[ "$2" != --* ]]; then ROLLBACK_REVISION="$2"; shift; fi ;;
    status) ACTION="status" ;;
    --dry-run) DRY_RUN=true ;;
    --auto-rollback) AUTO_ROLLBACK=true ;;
    *) echo "❌ Unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

# ===========================================
# Directory Resolution
# ===========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$(dirname "$DEPLOY_DIR")"
ROOT_DIR="$(dirname "$(dirname "$SERVER_DIR")")"
CONFIG_FILE="$DEPLOY_DIR/deploy.config.yaml"
GCLOUD="${GCLOUD_BIN:-gcloud}"
NODE="${NODE_BIN:-node}"
HEALTH_PATH="${DEPLOY_HEALTH_PATH:-/health/ready}"
HEALTH_ATTEMPTS="${DEPLOY_HEALTH_ATTEMPTS:-6}"
HEALTH_INTERVAL="${DEPLOY_HEALTH_INTERVAL:-10}"

# Mutating commands go through run(): printed instead of executed in --dry-run.
run() {
  if [ "$DRY_RUN" = true ]; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

# ===========================================
# Validate Config File
# ===========================================
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: Configuration file not found at $CONFIG_FILE"
  exit 1
fi

# ===========================================
# Parse Available Environments from YAML
# ===========================================
get_available_environments() {
  grep -A 1000 "^environments:" "$CONFIG_FILE" | \
  grep "^  [a-z]" | \
  sed 's/:.*//' | \
  sed 's/^  //'
}

AVAILABLE_ENVS=$(get_available_environments)

if [ -z "$ENV" ]; then
  echo "❌ Usage: $0 <environment> [rollback [revision]|status] [--dry-run] [--auto-rollback]"
  echo ""
  echo "Available environments (from deploy.config.yaml):"
  while IFS= read -r env; do
    echo "  - $env"
  done <<< "$AVAILABLE_ENVS"
  exit 1
fi

if ! echo "$AVAILABLE_ENVS" | grep -q "^$ENV$"; then
  echo "❌ Invalid environment: $ENV"
  echo ""
  echo "Available environments:"
  while IFS= read -r env; do
    echo "  - $env"
  done <<< "$AVAILABLE_ENVS"
  exit 1
fi

# ===========================================
# YAML Parser Function
# ===========================================
parse_yaml_value() {
  local section=$1
  local key=$2
  local default=$3
  local value=""

  # Try to get value from environment-specific section first
  if [ -n "$section" ]; then
    value=$(awk -v section="$section" '
            /^  [^[:space:]#]/ { if (active) exit; active = ($1 == section ":"); next }
            active && /^[^[:space:]#]/ { exit }
            active { print }
          ' "$CONFIG_FILE" | \
            grep "^    $key:" | \
            head -1 | \
            sed "s/^    $key: *//" | \
            sed 's/#.*//' | \
            sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | \
            sed 's/^"//' | sed 's/"$//' | \
            sed "s/^'//" | sed "s/'$//" || true)

    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  fi

  # Fallback to defaults section
  value=$(awk '
          /^defaults:/ { active = 1; next }
          active && /^[^[:space:]#]/ { exit }
          active { print }
        ' "$CONFIG_FILE" | \
          grep "^  $key:" | \
          head -1 | \
          sed "s/^  $key: *//" | \
          sed 's/#.*//' | \
          sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | \
          sed 's/^"//' | sed 's/"$//' | \
          sed "s/^'//" | sed "s/'$//" || true)

  if [ -n "$value" ]; then
    echo "$value"
  else
    echo "$default"
  fi
}

# ===========================================
# Load Configuration
# ===========================================
echo "📋 Loading configuration from deploy.config.yaml..."

SERVICE_NAME=$(parse_yaml_value "$ENV" "service_name" "flowstack-server-$ENV")
MEMORY=$(parse_yaml_value "$ENV" "memory" "1Gi")
CPU=$(parse_yaml_value "$ENV" "cpu" "1")
MIN_INSTANCES=$(parse_yaml_value "$ENV" "min_instances" "0")
MAX_INSTANCES=$(parse_yaml_value "$ENV" "max_instances" "5")
CONCURRENCY=$(parse_yaml_value "$ENV" "concurrency" "80")
TIMEOUT=$(parse_yaml_value "$ENV" "timeout" "300")
ALLOW_UNAUTH=$(parse_yaml_value "$ENV" "allow_unauthenticated" "true")
ARTIFACT_REGISTRY=$(parse_yaml_value "$ENV" "artifact_registry" "flowstack")
SECRETS_SOURCE=$(parse_yaml_value "$ENV" "secrets_source" "env-file")
SECRET_PREFIX=$(parse_yaml_value "$ENV" "secret_prefix" "${ENV}_")
RUNTIME_SA=$(parse_yaml_value "$ENV" "runtime_service_account" "")
PRODUCTION=$(parse_yaml_value "$ENV" "production" "false")

REGION="${GCP_REGION:-$(parse_yaml_value "$ENV" "region" "us-central1")}"
SA_KEY_FILE=$(parse_yaml_value "$ENV" "service_account_key" "gcp-service-account.json")

if [ "$SECRETS_SOURCE" != "env-file" ] && [ "$SECRETS_SOURCE" != "secret-manager" ] && [ "$SECRETS_SOURCE" != "infisical" ]; then
  echo "❌ secrets_source must be env-file, secret-manager or infisical (got: $SECRETS_SOURCE)"
  exit 1
fi

# ===========================================
# GCP Authentication
# ===========================================
# Preferred: keyless. In GitHub Actions, google-github-actions/auth sets up
# Workload Identity Federation; locally, use `gcloud auth login`.
# Legacy: a service account JSON key (GCP_SA_KEY_PATH or service_account_key).
SA_KEY="${GCP_SA_KEY_PATH:-}"
if [ -z "$SA_KEY" ] && [ -n "$SA_KEY_FILE" ] && [ -f "$SERVER_DIR/$SA_KEY_FILE" ]; then
  SA_KEY="$SERVER_DIR/$SA_KEY_FILE"
fi

echo ""
if [ -n "$SA_KEY" ]; then
  if [ ! -f "$SA_KEY" ]; then
    echo "❌ Error: Service account key not found at $SA_KEY"
    exit 1
  fi
  echo "⚠️  Using a service account JSON key (legacy). Prefer Workload Identity Federation; see apps/server/DEPLOYMENT.md."
  run "$GCLOUD" auth activate-service-account --key-file="$SA_KEY" --quiet
  PROJECT_ID="${PROJECT_ID:-$(grep '"project_id":' "$SA_KEY" | head -1 | cut -d '"' -f 4)}"
else
  echo "🔐 Using existing gcloud credentials (keyless)..."
  ACTIVE_ACCOUNT=$("$GCLOUD" auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1 || true)
  if [ -z "$ACTIVE_ACCOUNT" ]; then
    echo "❌ No active gcloud credentials. Run \`gcloud auth login\` locally, or use google-github-actions/auth in CI."
    exit 1
  fi
  PROJECT_ID="${PROJECT_ID:-$("$GCLOUD" config get-value project 2>/dev/null || true)}"
fi

if [ -z "${PROJECT_ID:-}" ]; then
  echo "❌ Error: No GCP project. Set PROJECT_ID or run \`gcloud config set project <id>\`."
  exit 1
fi
echo "📌 Project ID: $PROJECT_ID"

IMAGE_REPO="$REGION-docker.pkg.dev/$PROJECT_ID/$ARTIFACT_REGISTRY/$SERVICE_NAME"

describe_service() {
  "$GCLOUD" run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format=json 2>/dev/null
}

# Polls a URL until it returns 2xx. Uses an identity token for private services.
health_check() {
  local url="$1$HEALTH_PATH"
  local auth=()
  if [ "$ALLOW_UNAUTH" != "true" ]; then
    local token
    token=$("$GCLOUD" auth print-identity-token --audiences="$1" 2>/dev/null || "$GCLOUD" auth print-identity-token 2>/dev/null || true)
    [ -n "$token" ] && auth=(-H "Authorization: Bearer $token")
  fi
  for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
    if curl -fsS --max-time 10 ${auth[@]+"${auth[@]}"} "$url" >/dev/null 2>&1; then
      echo "  ✓ Healthy: $url (attempt $attempt)"
      return 0
    fi
    echo "  … not healthy yet: $url (attempt $attempt/$HEALTH_ATTEMPTS)"
    [ "$attempt" -lt "$HEALTH_ATTEMPTS" ] && sleep "$HEALTH_INTERVAL"
  done
  return 1
}

route_all_traffic() {
  run "$GCLOUD" run services update-traffic "$SERVICE_NAME" \
    --project "$PROJECT_ID" --region "$REGION" \
    --to-revisions "$1=100" --quiet
}

# Marks a revision that failed verification so rollbacks never select it.
# It keeps 0% traffic; nothing is deleted, so its logs remain available.
mark_failed() {
  local revision="$1"
  [ -z "$revision" ] && return 0
  run "$GCLOUD" run services update-traffic "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" \
    --update-tags "failed-$RELEASE_LABEL=$revision" --quiet || true
}

report() {
  # Summary for humans, the GitHub step summary and (DEPLOY_REPORT_FILE) a
  # JSON audit record. Contains no secret values.
  local outcome="$1"
  if [ -n "${DEPLOY_REPORT_FILE:-}" ]; then
    local run_url=""
    if [ -n "${GITHUB_RUN_ID:-}" ]; then
      run_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/$GITHUB_RUN_ID"
    fi
    REPORT_ACTION="$ACTION" REPORT_OUTCOME="$outcome" REPORT_ENV="$ENV" REPORT_SERVICE="$SERVICE_NAME" \
    REPORT_PROJECT="$PROJECT_ID" REPORT_REGION="$REGION" REPORT_RELEASE="${RELEASE:-}" REPORT_IMAGE="${IMAGE:-}" \
    REPORT_NEW="${NEW_REVISION:-}" REPORT_PREVIOUS="${PREVIOUS_REVISION:-}" REPORT_SERVING="${SERVING_AFTER:-}" \
    REPORT_ACTOR="${GITHUB_ACTOR:-${USER:-unknown}}" REPORT_DRY_RUN="$DRY_RUN" REPORT_RUN_URL="$run_url" \
    DEPLOY_REPORT_FILE="$DEPLOY_REPORT_FILE" "$NODE" -e '
      const e = process.env;
      require("node:fs").writeFileSync(e.DEPLOY_REPORT_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        action: e.REPORT_ACTION, outcome: e.REPORT_OUTCOME, environment: e.REPORT_ENV,
        service: e.REPORT_SERVICE, project: e.REPORT_PROJECT, region: e.REPORT_REGION,
        release: e.REPORT_RELEASE || null, image: e.REPORT_IMAGE || null,
        newRevision: e.REPORT_NEW || null, previousRevision: e.REPORT_PREVIOUS || null,
        servingRevision: e.REPORT_SERVING || null, actor: e.REPORT_ACTOR,
        runUrl: e.REPORT_RUN_URL || null, dryRun: e.REPORT_DRY_RUN === "true",
      }, null, 2) + "\n");
    ' 2>/dev/null || echo "⚠️  Could not write $DEPLOY_REPORT_FILE"
  fi
  echo ""
  echo "============================================"
  echo "Deployment report"
  echo "  outcome:     $outcome"
  echo "  environment: $ENV"
  echo "  service:     $SERVICE_NAME ($REGION, $PROJECT_ID)"
  echo "  release:     ${RELEASE:-n/a}"
  echo "  image:       ${IMAGE:-n/a}"
  echo "  revision:    ${NEW_REVISION:-n/a}"
  echo "  previous:    ${PREVIOUS_REVISION:-none}"
  echo "  serving:     ${SERVING_AFTER:-unknown}"
  echo "  actor:       ${GITHUB_ACTOR:-${USER:-unknown}}"
  echo "  dry-run:     $DRY_RUN"
  echo "============================================"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "### Cloud Run $ACTION: $outcome"
      echo "| Field | Value |"
      echo "|---|---|"
      echo "| Environment | $ENV |"
      echo "| Service | $SERVICE_NAME |"
      echo "| Release | ${RELEASE:-n/a} |"
      echo "| New revision | ${NEW_REVISION:-n/a} |"
      echo "| Previous revision | ${PREVIOUS_REVISION:-none} |"
      echo "| Serving now | ${SERVING_AFTER:-unknown} |"
    } >> "$GITHUB_STEP_SUMMARY"
  fi
}

# ===========================================
# Status
# ===========================================
if [ "$ACTION" = "status" ]; then
  SERVICE_JSON=$(describe_service || true)
  if [ -z "$SERVICE_JSON" ]; then
    echo "Service $SERVICE_NAME does not exist yet."
    exit 0
  fi
  echo "Serving revision: $(echo "$SERVICE_JSON" | "$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" serving || echo unknown)"
  "$GCLOUD" run revisions list --service "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --limit 10
  exit 0
fi

# ===========================================
# Rollback (traffic only; never touches the database)
# ===========================================
if [ "$ACTION" = "rollback" ]; then
  SERVICE_JSON=$(describe_service || true)
  if [ -z "$SERVICE_JSON" ]; then
    echo "❌ Service $SERVICE_NAME does not exist; nothing to roll back."
    exit 1
  fi
  PREVIOUS_REVISION=$(echo "$SERVICE_JSON" | "$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" serving || true)
  TARGET="$ROLLBACK_REVISION"
  if [ -z "$TARGET" ]; then
    FAILED=$(echo "$SERVICE_JSON" | "$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" failed || true)
    TARGET=$("$GCLOUD" run revisions list --service "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format=json \
      | "$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" rollback-target "$PREVIOUS_REVISION" "$FAILED" || true)
  fi
  if [ -z "$TARGET" ]; then
    echo "❌ No earlier Ready revision deployed by this script was found. Pass a revision name explicitly."
    exit 1
  fi
  NEW_REVISION="$TARGET"
  echo "↩️  Rolling back $SERVICE_NAME: $PREVIOUS_REVISION -> $TARGET"
  echo "   Note: database migrations are not reverted. Check that $TARGET is compatible with the current schema."
  route_all_traffic "$TARGET"
  SERVICE_URL=$(echo "$SERVICE_JSON" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).status?.url||""))')
  if [ "$DRY_RUN" = true ] || health_check "$SERVICE_URL"; then
    SERVING_AFTER="$TARGET"
    report "rolled-back"
    exit 0
  fi
  echo "❌ $TARGET is not healthy either. Restoring $PREVIOUS_REVISION."
  route_all_traffic "$PREVIOUS_REVISION"
  SERVING_AFTER="$PREVIOUS_REVISION"
  report "rollback-failed"
  exit 1
fi

# ===========================================
# Deploy: preflight
# ===========================================
RELEASE="${FLOWSTACK_RELEASE:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD 2>/dev/null || echo unknown)}"
if [ -n "$(git -C "$ROOT_DIR" status --porcelain 2>/dev/null || true)" ]; then
  if [ "$PRODUCTION" = "true" ]; then
    echo "❌ Uncommitted changes: production deploys must come from a clean, committed tree."
    exit 1
  fi
  RELEASE="$RELEASE-dirty-$(date +%Y%m%d%H%M%S)"
fi
RELEASE_LABEL=$("$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" sanitize "$RELEASE")
CANDIDATE_TAG="r-$("$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" sanitize "$RELEASE" | cut -c1-30)"
IMAGE="$IMAGE_REPO:$RELEASE_LABEL"

if [ "$PRODUCTION" = "true" ] && [ "${CI:-}" != "true" ] && [ "${FLOWSTACK_ALLOW_LOCAL_PRODUCTION_DEPLOY:-}" != "1" ]; then
  echo "❌ $ENV is marked production: deploy it from the GitHub Actions workflow (which requires approval)."
  echo "   For an emergency operator deploy set FLOWSTACK_ALLOW_LOCAL_PRODUCTION_DEPLOY=1."
  exit 1
fi

echo ""
echo "🔎 Preflight..."
SECRET_MAPPING=""
ENV_FILE=""
if [ "$SECRETS_SOURCE" = "infisical" ]; then
  INFISICAL_RUNTIME_CONFIG=$(FLOWSTACK_RUNTIME_SERVICE_ACCOUNT="$RUNTIME_SA" "$NODE" "$ROOT_DIR/scripts/deploy-preflight.mjs" infisical "$ENV")
elif [ "$SECRETS_SOURCE" = "secret-manager" ]; then
  SECRET_MAPPING=$("$NODE" "$ROOT_DIR/scripts/deploy-preflight.mjs" secret-manager "$ENV" "$SECRET_PREFIX" "$PROJECT_ID")
else
  ENV_FILE_NAME=$(parse_yaml_value "$ENV" "env_file" "")
  if [ -n "$ENV_FILE_NAME" ]; then
    ENV_FILE="$SERVER_DIR/$ENV_FILE_NAME"
  else
    ENV_FILE="$SERVER_DIR/.env.$ENV"
  fi
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Environment file not found at $ENV_FILE"
    echo "   Create it from $SERVER_DIR/.env.$ENV.example, or switch this environment to secrets_source: secret-manager."
    exit 1
  fi
  if [ "$PRODUCTION" = "true" ]; then
    echo "⚠️  $ENV reads secrets from a local env file. Switch to secrets_source: secret-manager so production secrets never sit in files."
  fi
  "$NODE" "$ROOT_DIR/scripts/deploy-preflight.mjs" env-file "$ENV" "$ENV_FILE"
fi

echo ""
echo "🌍 Environment: $ENV"
echo "📦 Service Name: $SERVICE_NAME"
echo "🖼️  Image: $IMAGE"
echo "🏷️  Release: $RELEASE"
echo "📍 Region: $REGION"
echo "💾 Memory: $MEMORY"
echo "🔧 CPU: $CPU"
echo "📊 Instances: $MIN_INSTANCES - $MAX_INSTANCES"
echo "⚡ Concurrency: $CONCURRENCY"
echo "⏱️  Timeout: ${TIMEOUT}s"
echo "🔑 Secrets: $SECRETS_SOURCE"

# ===========================================
# Artifact Registry and image build
# ===========================================
echo ""
echo "📦 Ensuring Artifact Registry repository exists..."
if ! "$GCLOUD" artifacts repositories describe "$ARTIFACT_REGISTRY" --project "$PROJECT_ID" --location="$REGION" --quiet >/dev/null 2>&1; then
  run "$GCLOUD" artifacts repositories create "$ARTIFACT_REGISTRY" \
    --project "$PROJECT_ID" \
    --repository-format=docker \
    --location="$REGION" \
    --description="FlowStack Docker images" \
    --quiet
fi

echo ""
echo "🏗️  Building container image $IMAGE..."
cd "$ROOT_DIR"
run "$GCLOUD" builds submit \
  --project "$PROJECT_ID" \
  --config=cloudbuild.yaml \
  --substitutions=_IMAGE_NAME="$IMAGE" \
  --timeout=20m \
  --region="$REGION" \
  --quiet

# ===========================================
# Runtime configuration
# ===========================================
DEPLOY_ARGS=(
  --project "$PROJECT_ID"
  --image "$IMAGE"
  --platform managed
  --region "$REGION"
  --memory "$MEMORY"
  --cpu "$CPU"
  --min-instances "$MIN_INSTANCES"
  --max-instances "$MAX_INSTANCES"
  --concurrency "$CONCURRENCY"
  --timeout "$TIMEOUT"
  --labels "flowstack-release=$RELEASE_LABEL,flowstack-env=$("$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" sanitize "$ENV")"
  --quiet
)
if [ "$ALLOW_UNAUTH" = "true" ]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
else
  DEPLOY_ARGS+=(--no-allow-unauthenticated)
fi
[ -n "$RUNTIME_SA" ] && DEPLOY_ARGS+=(--service-account "$RUNTIME_SA")

if [ "$SECRETS_SOURCE" = "infisical" ]; then
  # Only public bootstrap configuration reaches Cloud Run. Secrets are fetched
  # inside the instance using its service identity, before the API is imported.
  DEPLOY_ARGS+=(
    --set-env-vars "^|^NODE_ENV=production|ENVIRONMENT=$ENV|FLOWSTACK_RELEASE=$RELEASE|$INFISICAL_RUNTIME_CONFIG"
    --clear-secrets
  )
elif [ "$SECRETS_SOURCE" = "secret-manager" ]; then
  # Values are resolved by Cloud Run at runtime; none pass through this machine.
  DEPLOY_ARGS+=(
    --set-env-vars "NODE_ENV=production,ENVIRONMENT=$ENV,FLOWSTACK_RELEASE=$RELEASE"
    --set-secrets "$SECRET_MAPPING"
  )
else
  echo ""
  echo "📋 Preparing environment variables..."
  # mktemp creates the file with mode 0600; it is deleted on exit.
  TEMP_ENV_YAML=$(mktemp "${TMPDIR:-/tmp}/flowstack-deploy-env.XXXXXX")
  echo "NODE_ENV: \"production\"" > "$TEMP_ENV_YAML"
  echo "ENVIRONMENT: \"$ENV\"" >> "$TEMP_ENV_YAML"
  echo "FLOWSTACK_RELEASE: \"$RELEASE\"" >> "$TEMP_ENV_YAML"

  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

    # Split on first = only
    key="${line%%=*}"
    value="${line#*=}"

    # If no = found, skip the line
    [[ "$key" == "$line" ]] && continue

    # Trim leading/trailing whitespace from key
    key=$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

    # Skip if key is empty
    [[ -z "$key" ]] && continue

    # Skip NODE_ENV and PORT as they're already added or reserved
    [[ "$key" == "NODE_ENV" || "$key" == "PORT" ]] && continue

    # Trim leading/trailing whitespace from value
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

    # Handle inline comments and quotes
    # Strategy: Handle escaped quotes, validate tail, then remove quotes

    # Pattern explanation:
    # - (([^"\\]|\\.)*)  matches either non-quote/non-backslash OR backslash+any char
    # - This allows \" to be treated as escaped quote (not end of string)
    # - Capture group 3 is the tail after closing quote (should be empty or comment)

    if [[ "$value" =~ ^\"(([^\"\\]|\\.)*)\"(.*)$ ]]; then
      # Double-quoted value with escaped quote support
      value="${BASH_REMATCH[1]}"
      tail="${BASH_REMATCH[3]}"

      # Validate tail is only whitespace and optional comment
      if [[ -n "$tail" ]] && [[ ! "$tail" =~ ^[[:space:]]*(#.*)?$ ]]; then
        echo "❌ Error: Malformed line for $key - unexpected content after closing quote: $tail" >&2
        exit 1
      fi

      # Un-escape: \" → " and \\ → \
      value=$(echo "$value" | sed -e 's/\\"/"/g' -e 's/\\\\/\\/g')

    elif [[ "$value" =~ ^\'(([^\'\\]|\\.)*)\'(.*)$ ]]; then
      # Single-quoted value with escaped quote support
      value="${BASH_REMATCH[1]}"
      tail="${BASH_REMATCH[3]}"

      # Validate tail is only whitespace and optional comment
      if [[ -n "$tail" ]] && [[ ! "$tail" =~ ^[[:space:]]*(#.*)?$ ]]; then
        echo "❌ Error: Malformed line for $key - unexpected content after closing quote: $tail" >&2
        exit 1
      fi

      # Un-escape: \' → ' and \\ → \
      value=$(echo "$value" | sed -e "s/\\\\'/'/g" -e 's/\\\\/\\/g')

    else
      # Not quoted - strip inline comments (require space before #)
      value=$(echo "$value" | sed -E 's/[[:space:]]+#.*//')
    fi

    # Escape for YAML: first backslashes, then double quotes
    value=$(echo "$value" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

    # Add to YAML environment file (always use double quotes)
    echo "${key}: \"${value}\"" >> "$TEMP_ENV_YAML"
    echo "  ✓ Added: $key"
  done < "$ENV_FILE"
  DEPLOY_ARGS+=(--env-vars-file="$TEMP_ENV_YAML")
fi

# ===========================================
# Deploy and verify
# ===========================================
SERVICE_JSON=$(describe_service || true)
PREVIOUS_REVISION=""
if [ -n "$SERVICE_JSON" ]; then
  PREVIOUS_REVISION=$(echo "$SERVICE_JSON" | "$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" serving || true)
fi

echo ""
if [ -z "$PREVIOUS_REVISION" ]; then
  # First deploy: Cloud Run cannot create a service with no traffic.
  echo "🚀 First deployment of $SERVICE_NAME..."
  run "$GCLOUD" run deploy "$SERVICE_NAME" "${DEPLOY_ARGS[@]}"
  [ "$DRY_RUN" = true ] && { report "dry-run"; exit 0; }
  SERVICE_JSON=$(describe_service)
  NEW_REVISION=$(echo "$SERVICE_JSON" | "$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" serving || true)
  SERVICE_URL=$(echo "$SERVICE_JSON" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).status?.url||""))')
  if health_check "$SERVICE_URL"; then
    SERVING_AFTER="$NEW_REVISION"
    report "deployed"
    exit 0
  fi
  SERVING_AFTER="$NEW_REVISION"
  report "unhealthy-first-deploy"
  echo "❌ The first revision is unhealthy and there is no earlier revision to restore. Check logs: gcloud run services logs read $SERVICE_NAME --region $REGION"
  exit 1
fi

echo "🚀 Deploying candidate revision with no traffic (tag $CANDIDATE_TAG)..."
run "$GCLOUD" run deploy "$SERVICE_NAME" "${DEPLOY_ARGS[@]}" --no-traffic --tag "$CANDIDATE_TAG"
if [ "$DRY_RUN" = true ]; then
  echo "  [dry-run] health check candidate, then: $GCLOUD run services update-traffic $SERVICE_NAME --to-revisions <candidate>=100"
  SERVING_AFTER="$PREVIOUS_REVISION"
  report "dry-run"
  exit 0
fi

SERVICE_JSON=$(describe_service)
CANDIDATE_URL=$(echo "$SERVICE_JSON" | "$NODE" "$ROOT_DIR/scripts/cloud-run.mjs" tag-url "$CANDIDATE_TAG" || true)
NEW_REVISION=$("$GCLOUD" run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format='value(status.latestCreatedRevisionName)')

echo ""
echo "🩺 Verifying candidate $NEW_REVISION before it receives traffic..."
if [ -z "$CANDIDATE_URL" ] || ! health_check "$CANDIDATE_URL"; then
  run "$GCLOUD" run services update-traffic "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --remove-tags "$CANDIDATE_TAG" --quiet || true
  mark_failed "$NEW_REVISION"
  SERVING_AFTER="$PREVIOUS_REVISION"
  report "failed-verification"
  echo "❌ Candidate failed its health check. Traffic stays on $PREVIOUS_REVISION; nothing to roll back."
  echo "   Logs: gcloud run services logs read $SERVICE_NAME --region $REGION"
  exit 1
fi

echo "🔀 Moving traffic to $NEW_REVISION..."
route_all_traffic "$NEW_REVISION"
run "$GCLOUD" run services update-traffic "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --remove-tags "$CANDIDATE_TAG" --quiet || true

SERVICE_URL=$(describe_service | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).status?.url||""))')
if [ "$AUTO_ROLLBACK" = true ] && ! health_check "$SERVICE_URL"; then
  echo "❌ Service unhealthy after traffic switch. Auto-rollback to $PREVIOUS_REVISION."
  route_all_traffic "$PREVIOUS_REVISION"
  mark_failed "$NEW_REVISION"
  SERVING_AFTER="$PREVIOUS_REVISION"
  if health_check "$SERVICE_URL"; then
    report "rolled-back"
  else
    report "rollback-unhealthy"
  fi
  exit 1
fi

SERVING_AFTER="$NEW_REVISION"
report "deployed"
echo "🔗 URL: $SERVICE_URL"
