#!/usr/bin/env bash
set -uo pipefail

PROJECT_NAME="${PROJECT_NAME:-cac}"
BRANCH="${BRANCH:-production}"
BUILD_DIR="${BUILD_DIR:-out}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
BASE_WAIT_SECONDS="${BASE_WAIT_SECONDS:-10}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-300}"

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "Build directory '$BUILD_DIR' does not exist. Run npm run build first."
  exit 1
fi

attempt=1

while (( attempt <= MAX_ATTEMPTS )); do
  echo "Cloudflare Pages deploy attempt ${attempt}/${MAX_ATTEMPTS}"

  npx wrangler pages deploy "$BUILD_DIR" \
    --project-name "$PROJECT_NAME" \
    --branch "$BRANCH" \
    --commit-dirty=true

  status=$?
  if [[ $status -eq 0 ]]; then
    echo "Cloudflare Pages deploy succeeded on attempt ${attempt}."
    exit 0
  fi

  if (( attempt == MAX_ATTEMPTS )); then
    echo "Cloudflare Pages deploy failed after ${MAX_ATTEMPTS} attempts."
    exit "$status"
  fi

  wait_seconds=$(( BASE_WAIT_SECONDS * (2 ** (attempt - 1)) ))
  if (( wait_seconds > MAX_WAIT_SECONDS )); then
    wait_seconds="$MAX_WAIT_SECONDS"
  fi

  echo "Deploy failed with exit code ${status}. Retrying in ${wait_seconds}s..."
  sleep "$wait_seconds"
  attempt=$(( attempt + 1 ))
done
