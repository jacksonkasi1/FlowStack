#!/bin/bash
set -e

# Trap to ensure cleanup on exit
trap 'rm -f "$TEMP_ENV_YAML"' EXIT

# ===========================================
# FlowStack Server - GCP Cloud Run Deployment
# ===========================================
# Usage: ./deploy.sh <environment>
# Example: ./deploy.sh prod
# ===========================================

ENV=$1

# ===========================================
# Directory Resolution
# ===========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$(dirname "$DEPLOY_DIR")"
ROOT_DIR="$(dirname "$(dirname "$SERVER_DIR")")"
CONFIG_FILE="$DEPLOY_DIR/deploy.config.yaml"

echo "📁 Root directory: $ROOT_DIR"
echo "📁 Server directory: $SERVER_DIR"

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

# ===========================================
# Validate Environment Argument
# ===========================================
if [ -z "$ENV" ]; then
  echo "❌ Usage: $0 <environment>"
  echo ""
  echo "Available environments (from deploy.config.yaml):"
  while IFS= read -r env; do
    echo "  - $env"
  done <<< "$AVAILABLE_ENVS"
  exit 1
fi

# Check if environment exists in config
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

  # Try to get value from environment-specific section first
  if [ -n "$section" ]; then
    value=$(grep -A 20 "^  $section:" "$CONFIG_FILE" | \
            grep "^    $key:" | \
            head -1 | \
            sed "s/^    $key: *//" | \
            sed 's/^"//' | sed 's/"$//' | \
            sed "s/^'//" | sed "s/'$//")

    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  fi

  # Fallback to defaults section
  value=$(grep -A 20 "^defaults:" "$CONFIG_FILE" | \
          grep "^  $key:" | \
          head -1 | \
          sed "s/^  $key: *//" | \
          sed 's/^"//' | sed 's/"$//' | \
          sed "s/^'//" | sed "s/'$//")

  if [ -n "$value" ]; then
    echo "$value"
  else
    echo "$default"
  fi
}

# ===========================================
# Load Configuration
# ===========================================
echo ""
echo "📋 Loading configuration from deploy.config.yaml..."

# Load with priority: ENV VAR > environment config > defaults
SERVICE_NAME=$(parse_yaml_value "$ENV" "service_name" "flowstack-server-$ENV")
MEMORY=$(parse_yaml_value "$ENV" "memory" "1Gi")
CPU=$(parse_yaml_value "$ENV" "cpu" "1")
MIN_INSTANCES=$(parse_yaml_value "$ENV" "min_instances" "0")
MAX_INSTANCES=$(parse_yaml_value "$ENV" "max_instances" "5")
CONCURRENCY=$(parse_yaml_value "$ENV" "concurrency" "80")
TIMEOUT=$(parse_yaml_value "$ENV" "timeout" "300")
ALLOW_UNAUTH=$(parse_yaml_value "$ENV" "allow_unauthenticated" "true")
ARTIFACT_REGISTRY=$(parse_yaml_value "$ENV" "artifact_registry" "flowstack")

# These can be overridden by environment variables
REGION="${GCP_REGION:-$(parse_yaml_value "$ENV" "region" "us-central1")}"
SA_KEY_FILE=$(parse_yaml_value "$ENV" "service_account_key" "gcp-service-account.json")
SA_KEY="${GCP_SA_KEY_PATH:-$SERVER_DIR/$SA_KEY_FILE}"

# ===========================================
# Environment File Validation
# ===========================================
ENV_FILE="$SERVER_DIR/.env.$ENV"
if [ ! -f "$ENV_FILE" ]; then
  # Fallback to .env if .env.$ENV doesn't exist
  ENV_FILE="$SERVER_DIR/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: Environment file not found at $SERVER_DIR/.env.$ENV or $SERVER_DIR/.env"
  echo ""
  echo "📋 To create the file, run:"
  echo "   cp $SERVER_DIR/.env.$ENV.example $SERVER_DIR/.env.$ENV"
  echo "   # Then edit with your values"
  exit 1
fi

echo "📋 Using environment file: $ENV_FILE"

# ===========================================
# Service Account Validation
# ===========================================
if [ ! -f "$SA_KEY" ]; then
  echo "❌ Error: Service account key not found at $SA_KEY"
  echo "   Please place your service account JSON in apps/server/"
  echo "   Or set GCP_SA_KEY_PATH environment variable"
  exit 1
fi

# ===========================================
# GCP Authentication
# ===========================================
echo ""
echo "🔐 Authenticating with Service Account..."
gcloud auth activate-service-account --key-file="$SA_KEY" --quiet

PROJECT_ID="${PROJECT_ID:-$(grep '"project_id":' "$SA_KEY" | head -1 | cut -d '"' -f 4)}"
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: Could not parse project_id from service account file."
  exit 1
fi

echo "📌 Project ID: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" --quiet

# ===========================================
# Build Configuration Summary
# ===========================================
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/$ARTIFACT_REGISTRY/$SERVICE_NAME"

echo ""
echo "🌍 Environment: $ENV"
echo "📦 Service Name: $SERVICE_NAME"
echo "🖼️  Image: $IMAGE_NAME"
echo "📍 Region: $REGION"
echo "💾 Memory: $MEMORY"
echo "🔧 CPU: $CPU"
echo "📊 Instances: $MIN_INSTANCES - $MAX_INSTANCES"
echo "⚡ Concurrency: $CONCURRENCY"
echo "⏱️  Timeout: ${TIMEOUT}s"

# ===========================================
# Create Artifact Registry if not exists
# ===========================================
echo ""
echo "📦 Ensuring Artifact Registry repository exists..."
gcloud artifacts repositories describe "$ARTIFACT_REGISTRY" \
  --location="$REGION" \
  --quiet 2>/dev/null || \
gcloud artifacts repositories create "$ARTIFACT_REGISTRY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="FlowStack Docker images" \
  --quiet

# ===========================================
# Build Container Image
# ===========================================
echo ""
echo "🏗️  Building container image..."
cd "$ROOT_DIR"

# Build and push using Cloud Build with cloudbuild.yaml
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_IMAGE_NAME="$IMAGE_NAME" \
  --timeout=20m \
  --region="$REGION" \
  --quiet

# ===========================================
# Prepare Environment Variables
# ===========================================
echo ""
echo "📋 Preparing environment variables..."

TEMP_ENV_YAML="$SERVER_DIR/.deploy-env.yaml"
echo "NODE_ENV: \"production\"" > "$TEMP_ENV_YAML"
echo "ENVIRONMENT: \"$ENV\"" >> "$TEMP_ENV_YAML"

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

  # Remove surrounding quotes if present (both single and double)
  if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
    value="${BASH_REMATCH[1]}"
  fi

  # Escape for YAML: first backslashes, then double quotes
  value=$(echo "$value" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

  # Add to YAML environment file (always use double quotes)
  echo "${key}: \"${value}\"" >> "$TEMP_ENV_YAML"
  echo "  ✓ Added: $key"
done < "$ENV_FILE"

# ===========================================
# Deploy to Cloud Run
# ===========================================
echo ""
echo "🚀 Deploying to Cloud Run..."

# Build allow-unauthenticated flag
if [ "$ALLOW_UNAUTH" = "true" ]; then
  AUTH_FLAG="--allow-unauthenticated"
else
  AUTH_FLAG="--no-allow-unauthenticated"
fi

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region "$REGION" \
  $AUTH_FLAG \
  --memory "$MEMORY" \
  --cpu "$CPU" \
  --min-instances "$MIN_INSTANCES" \
  --max-instances "$MAX_INSTANCES" \
  --concurrency "$CONCURRENCY" \
  --timeout "$TIMEOUT" \
  --env-vars-file="$TEMP_ENV_YAML" \
  --quiet

# ===========================================
# Get Service URL
# ===========================================
echo ""
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --format 'value(status.url)')

echo "============================================"
echo "✅ Deployment Complete!"
echo "============================================"
echo "🌍 Environment: $ENV"
echo "📦 Service: $SERVICE_NAME"
echo "🔗 URL: $SERVICE_URL"
echo "============================================"
