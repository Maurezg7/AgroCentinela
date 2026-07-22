#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-dev}"

echo "==> Validating template..."
sam validate --template-file template.yaml --lint

echo "==> Deploying stack agrocentinela-infra-${ENV}..."
sam deploy \
  --template-file template.yaml \
  --config-env "${ENV}" \
  --no-fail-on-empty-changeset

echo "==> Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "agrocentinela-infra-${ENV}" \
  --query "Stacks[0].Outputs" \
  --output table

echo "==> Done."
