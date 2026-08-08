# Cloudflare Pages Deploy

The Cloudflare Pages project for the live site is `cac`.

Live domains:

- `https://cancelagencyculture.in`
- `https://cac-web-app.pages.dev`

This project is not connected to a Git provider in Cloudflare Pages. Current deployment history shows `production` direct-upload deployments are treated as the Production environment, while `main` direct-upload deployments are previews. The GitHub workflow still triggers from `main`, then deploys to Cloudflare's `production` branch.

## GitHub Actions Production Deploy

The workflow at `.github/workflows/deploy.yml` builds the static Next.js export and deploys the `out` directory to Cloudflare Pages using Cloudflare's current Wrangler GitHub Action.

It runs on:

- pushes to `main`
- manual `workflow_dispatch`

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages edit/deploy permission for the account.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID for the `cac` Pages project.

Keep runtime app variables in Cloudflare Pages environment variables, not in GitHub Actions:

- `AI_PROVIDER`
- `NVIDIA_NIM_API_KEY`
- `NVIDIA_NIM_BASE_URL`
- `NVIDIA_NIM_DEFAULT_MODEL`
- `AI_DAILY_GLOBAL_LIMIT`
- `AI_DAILY_USER_LIMIT`
- `AI_MAX_OUTPUT_TOKENS`
- `AI_RUNTIME_TIMEOUT_MS`

## Local Deploy With Retries

If deploying locally and Cloudflare returns intermittent upload failures, build first and then run:

```bash
npm run build
bash scripts/deploy-cloudflare-pages-retry.sh
```

Optional overrides:

```bash
MAX_ATTEMPTS=10 PROJECT_NAME=cac BRANCH=production BUILD_DIR=out bash scripts/deploy-cloudflare-pages-retry.sh
```

If Cloudflare returns repeated `POST /pages/assets/upload -> 502 Bad Gateway` errors even for tiny uploads, wait and retry later or use the GitHub Actions workflow.
