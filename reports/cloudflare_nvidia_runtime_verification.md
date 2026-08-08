# Cloudflare NVIDIA Runtime Verification

Date: 2026-06-29

Purpose: verify that the current SaaS runtime is Cloudflare Pages / Pages Functions / D1 first, with NVIDIA NIM only as a controlled optional helper.

## Environment

- Cloudflare Pages project: `cac`
- Local dev command verified: `npx wrangler pages dev out --port 8788`
- Local URL: `http://localhost:8788`
- D1 binding: `DB`
- Local secrets file: `.dev.vars`, ignored by git
- Cloudflare secrets: present as encrypted values only

Encrypted Cloudflare Pages secrets confirmed:

- `AI_PROVIDER`
- `NVIDIA_NIM_API_KEY`
- `NVIDIA_NIM_BASE_URL`
- `NVIDIA_NIM_DEFAULT_MODEL`
- `AI_TEST_MODE`
- `AI_DAILY_GLOBAL_LIMIT`
- `AI_DAILY_USER_LIMIT`
- `AI_MAX_OUTPUT_TOKENS`

## Build Checks

- `npm run lint`: passed
- `npm run build`: passed

## API Smoke Checks

`/api/config`

- Success
- Payments disabled
- Planned price returned as `amountInPaise: 79900`

`/api/dev-login`

- Success
- Local tester cookie created

`/api/generate`

- Success
- Strategy returned
- `generation_source: knowledge_engine`
- `ai_calls_count: 0`
- `strategy_blocks_used: 51`
- `knowledge_objects_used: 3`
- `selectedCount: 51`
- Report schema valid

This confirms the default full strategy stayed D1/library-first and did not call NVIDIA.

`/api/generate-roast`

- Empty input rejected before AI
- Error: `Website text is required.`

`/api/generate-social`

- Weak/gibberish input rejected before AI
- Error: `Business name, industry, and offer need real details.`

`/api/reports`

- Success
- Saved reports loaded
- No AI call required

## Guard Checks

Direct no-network controlled-AI guard checks:

- `AI_PROVIDER=none`: returned fallback
- `AI_PROVIDER=nvidia_nim` with no key: returned fallback
- `AI_TASK_PROFILE=offline_block_generation` inside runtime: blocked and returned fallback

## Frontend Call-Site Check

- `src/app/details/page.tsx` does not call `/api/generate-social` or `/api/generate-roast`
- Tab switching in `src/components/StrategyWorkspace.tsx` is local state only
- PDF export in `src/components/StrategyWorkspace.tsx` uses `window.print`
- `/api/generate-roast` is only called from the homepage roast flow

## Result

Current setup is correct for the intended architecture:

- D1 library = main strategy brain
- NVIDIA NIM = optional helper only
- Cache/logging/limits = required around live AI calls
- Offline block generation = Node script only, no production import without manual approval
- Vercel = legacy reference only
