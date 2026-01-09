#!/bin/bash

# FlowStack GCR Deployment Script
# Usage: ./scripts/deploy-gcr.sh [project-id] [service-name] [region]

set -e

PROJECT_ID=${1:-flowstack-project}
SERVICE_NAME=${2:-flowstack-server}
REGION=${3:-us-central1}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying FlowStack to Google Cloud Run"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project ID: $PROJECT_ID"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"
echo "Image: $IMAGE_NAME"
echo ""

# Step 1: Set project
echo "📍 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Step 2: Build and push image
echo "🔨 Building Docker image..."
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_IMAGE_NAME=$IMAGE_NAME

# Step 3: Deploy to Cloud Run
echo "📦 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --env-vars-file apps/server/.env.prod \
  --memory 1Gi \
  --timeout 3600s \
  --max-instances 100

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: https://$SERVICE_NAME-*.run.app"
