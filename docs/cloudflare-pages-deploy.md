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
- `AI_DAILY_GLOBAL_LIMIT` — spend ceiling for bugs and abuse, counted in AI
  calls across the whole account. Not a product limit. `0` switches it off.
  It was `25`, which meant the fifth report of the day, from any customer,
  became the offline template. Anything below a few thousand will do that again.
- `AI_DAILY_USER_LIMIT` — per-customer daily cap, also counted in AI **calls**.
  One report is about five calls (one strategy call plus one per ten calendar
  days), so `40` is roughly eight reports a day. It was `3`, which could not
  finish even one report.
- `AI_PROVIDER_FAILOVER` — optional. When the provider in `AI_PROVIDER` errors,
  the other one is tried before falling back to the offline template. It only
  activates if the second provider has a key set, so setting **both**
  `NVIDIA_NIM_API_KEY` and `GEMINI_API_KEY` is what turns this on in practice.
  Set to `false` for a single attempt. A failed attempt is logged with
  `success = 0` and the daily counters only count successes, so failing over
  never costs a customer quota.
- `BACKGROUND_AI_ENRICHMENT` — optional. The customer is answered with the fast
  deterministic plan, and the AI rewrite runs after the response and saves over
  the same report. Set to `false` to go back to making the customer wait for the
  AI before they see anything.
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
