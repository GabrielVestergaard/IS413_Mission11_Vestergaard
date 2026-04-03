#!/usr/bin/env bash
# Deploy BackendApi to Azure App Service (zip deploy).
# Prerequisites: Azure CLI (`brew install azure-cli`), logged in (`az login`).
#
# Usage:
#   export AZURE_RESOURCE_GROUP="your-resource-group-name"
#   ./deploy-azure.sh
#
# Find the resource group: Azure Portal → your App Service → Overview → Resource group.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/BackendApi"
APP_NAME="${AZURE_WEBAPP_NAME:-bookstore-gabriel-backend-fydzcvg0ebhrf3fa}"
RG="${AZURE_RESOURCE_GROUP:-}"

if [[ -z "${RG}" ]]; then
  echo "Set AZURE_RESOURCE_GROUP to your App Service resource group, e.g.:"
  echo "  export AZURE_RESOURCE_GROUP=\"rg-my-apps\""
  exit 1
fi

echo "Publishing Release build..."
dotnet publish "${PROJECT_DIR}/BackendApi.csproj" -c Release -o "${PROJECT_DIR}/publish"

ZIP="${SCRIPT_DIR}/backend-deploy.zip"
rm -f "${ZIP}"
( cd "${PROJECT_DIR}/publish" && zip -r -q "${ZIP}" . )

echo "Deploying zip to ${APP_NAME} (resource group: ${RG})..."
az webapp deploy \
  --resource-group "${RG}" \
  --name "${APP_NAME}" \
  --src-path "${ZIP}" \
  --type zip

rm -f "${ZIP}"
echo "Done. Test: https://${APP_NAME}.francecentral-01.azurewebsites.net/api/books"
