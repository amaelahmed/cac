# CAC Website

CAC is a Cloudflare Pages SaaS for generating marketing strategy reports for small businesses and agencies. The public app explains the product, the `/details` builder collects the business brief, and the Cloudflare Functions API assembles a structured strategy from the D1 knowledge library.

## Current Product Mode

- Beta access is free for testers.
- Payments are not connected in the UI during testing.
- The future paid plan is configured as INR 799 every 31 days.
- Paywall enforcement only turns on when `ENABLE_PAYWALL=true`.

## Main Flows

- `/` - public marketing site.
- `/details` - signed-in strategy builder, report renderer, export, and saved report history.
- `/legal` - beta terms, privacy, and refund policy.
- `/admin` - admin dashboard for knowledge objects, import, telemetry, and settings.
- `/api/generate` - strategy generation endpoint.
- `/api/location-insights` - live location suggestions for the builder.
- `/api/web-insights` - own-site and competitor-site scanning.
- `/api/generate-roast` - AI website roast generation.
- `/api/generate-social` - AI caption and hashtag generation.
- `/api/reports` - saved report list, save, and detail endpoints.
- `/api/create-order` and `/api/verify-payment` - Razorpay backend endpoints kept for the future paid launch.

Strategy generation is intentionally database-first. Generic AI chat is disabled on `/api/generate`; controlled NVIDIA NIM calls are reserved for website roast, captions, hashtags, optional section polish, offline block drafting, and explicit web intelligence tasks.

## Local Development

Install dependencies:

```bash
npm install
```

Build the static Next.js export:

```bash
npm run build
```

Run the Cloudflare Pages preview, including Functions:

```bash
npx wrangler pages dev out --port 8788
```

The plain Next dev server (`npm run dev`) is useful for frontend work, but it does not fully emulate the Cloudflare Functions and D1 runtime used by the SaaS API.

## Required Environment

Set these in Cloudflare Pages and in local `.dev.vars` when testing auth/API flows:

```bash
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:8788
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=founder@example.com
```

Local testing can use the built-in localhost tester session when Google credentials are missing. The tester cookie is only enabled for `localhost` / `127.0.0.1` unless `DISABLE_LOCAL_TEST_AUTH=true`.

Optional controlled AI helper:

```bash
AI_PROVIDER=nvidia_nim
NVIDIA_NIM_API_KEY=...
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_DEFAULT_MODEL=minimaxai/minimax-m3
AI_TEST_MODE=true
AI_DAILY_GLOBAL_LIMIT=200000
AI_DAILY_USER_LIMIT=40
AI_MAX_OUTPUT_TOKENS=2000
AI_OFFLINE_MAX_OUTPUT_TOKENS=8000
AI_OFFLINE_TIMEOUT_MS=420000
ENABLE_PAYWALL=true
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

Leave `ENABLE_PAYWALL` unset or set to anything other than `true` for the free tester beta.

Production and preview variables belong in Cloudflare Pages:

Workers & Pages → `cac` → Settings → Variables and Secrets.

Add `NVIDIA_NIM_API_KEY` as an encrypted secret. Do not put secrets in `wrangler.toml`, do not commit them, and do not expose them to frontend code.

Local Cloudflare testing should use ignored `.dev.vars` or `.env` files. NVIDIA calls must stay server-side and must not be used for default full strategy generation.

## Data

The app expects a D1 binding named `DB`, configured in `wrangler.toml`. The knowledge engine uses the schema and seed assets in:

- `schema_v3.sql`
- `schema_v3_admin.sql`
- `data/industries/**`
- `scripts/seed/expand_library.mjs`

## Report Scoring

The four headline numbers on `/details` come from `functions/api/engine/diagnostics.js`,
not from the business brief's completeness. Each number is the weighted pass-rate
of a set of named checks (`CHECKS` in that file). A check reports `pass`, `fail`,
or `unknown`, and `unknown` checks are excluded from the score and listed to the
user as "not checked" instead of being folded into a number.

Checks also record whether their evidence was `verified` (CAC fetched the page and
inspected it) or `self_reported` (the user ticked a box). A group whose checks are
all self-reported, or which had only one runnable check, carries a caveat in the UI
so a high number cannot read as a verdict it has not earned.

`rankRecommendations()` in the same file orders the growth steps. Impact is earned
from how many failed checks a step repairs, weighted by those checks' importance;
effort and cost are inferred conservatively (when several rules match a step, the
most expensive one wins) so a two-week job is never presented as a quick win.

When adding a check, give it a plain-language `question`, a `weight`, and an
`evidence` string that quotes back what was actually observed. Never add a check
that scores how much the user typed.

## Verification

Before shipping a change:

```bash
npm run lint
npm run build
```

For end-to-end API behavior, preview with Wrangler Pages so `/api/*` routes and D1 bindings are active.
