#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-dev}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/packages/backend"
SHARED_DIR="$ROOT_DIR/packages/shared"
LAMBDA_DIR="$BACKEND_DIR/.lambda"

echo "==> Building packages/shared..."
cd "$SHARED_DIR"
npx tsc

echo "==> Building packages/backend..."
cd "$BACKEND_DIR"
npx nest build

echo "==> Preparing Lambda bundle..."
rm -rf "$LAMBDA_DIR"
mkdir -p "$LAMBDA_DIR"

# Copy compiled backend
cp -r "$BACKEND_DIR/dist/"* "$LAMBDA_DIR/"

# Generate production package.json (no devDeps, no jest, no shared ref)
node -e "
const pkg = require('$BACKEND_DIR/package.json');
delete pkg.devDependencies;
delete pkg.jest;
delete pkg.scripts;
const deps = { ...pkg.dependencies };
delete deps['@agrocentinela/shared'];
pkg.dependencies = deps;
require('fs').writeFileSync(
  '$LAMBDA_DIR/package.json',
  JSON.stringify(pkg, null, 2)
);
"

# Install production dependencies (real copies, no symlinks)
cd "$LAMBDA_DIR"
npm install --omit=dev --ignore-scripts 2>&1 | tail -3

# Copy shared package into node_modules
mkdir -p "$LAMBDA_DIR/node_modules/@agrocentinela/shared"
cp -r "$SHARED_DIR/dist" "$LAMBDA_DIR/node_modules/@agrocentinela/shared/dist"
cp "$SHARED_DIR/package.json" "$LAMBDA_DIR/node_modules/@agrocentinela/shared/"

echo "==> Validating SAM template..."
cd "$ROOT_DIR/infra"
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
