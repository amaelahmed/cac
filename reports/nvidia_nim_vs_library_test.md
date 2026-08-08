# NVIDIA NIM vs Batch 001 Library Test

Test date: 2026-06-29

This comparison uses one small NVIDIA NIM test only. It did not generate a full strategy, a full report, or a 30-day calendar.

## Inputs

Business: Cartroid  
Scope: pre-launch customised gift/product store in Kozhikode  
Audience: students / Gen-Z  
Platforms: Instagram, WhatsApp, Google Business  
Goal: launch properly, build trust, get first customers  
Budget: low

## NVIDIA NIM Output

Model: `minimaxai/minimax-m3`  
Latency: 132552ms  
Tokens: 488 prompt, 716 completion, 1204 total  
JSON validity: pass  
Required shape: pass  
Jargon check: pass  
Wrong-business check: pass

The NVIDIA output was specific, natural, and beginner-friendly. It gave a strong calendar card, a very usable WhatsApp reply, and a realistic customer fear around custom gifts arriving late or looking bad.

Best line:

> We will show you the design first. You say yes. Then we make it. No bad surprises.

## Current Batch 001 Library Output

Batch 001 is still the active local/live preview reference only.

It has:

- 51 active quality blocks
- 30 calendar blocks
- Cartroid-type scope only
- Pre-launch customised product/gift business
- Instagram, WhatsApp, Google Business
- Students/Gen-Z
- Kozhikode/Calicut

Sample calendar card:

```json
{
  "day": 1,
  "post_type": "Reel",
  "hook": "Custom gifts are coming to Kozhikode.",
  "caption": "Cartroid is opening soon. Send your idea, see a preview, confirm it, and get your customised product made.",
  "customer_action": "Message preview on WhatsApp."
}
```

## Comparison

1. Which one is easier to understand?

Both are easy. NVIDIA is more conversational. Batch 001 is shorter and cleaner inside the UI.

Winner: tie, depending on surface. NVIDIA for natural writing, library for scannable cards.

2. Which one feels more specific to Cartroid?

NVIDIA mentions Kozhikode, students/Gen-Z behavior, preview before making, delivery time, and fear of custom gift mistakes in one small output. Batch 001 covers these across many cards, but each card is more compact.

Winner: NVIDIA for a single card. Batch 001 for full coverage across a plan.

3. Which one gives better copy-ready text?

NVIDIA gives a stronger WhatsApp message and a more human caption. Batch 001 gives shorter copy that is easier to render and repeat safely.

Winner: NVIDIA for optional polish.

4. Which one has better action steps?

Batch 001 is more structured and predictable. NVIDIA gives richer “how to create” instructions, but it is slower and less controllable at scale.

Winner: Batch 001 for default product use. NVIDIA for improving a selected card.

5. Which one avoids jargon better?

Both passed the jargon check.

Winner: tie.

6. Which one is safer for cost?

Batch 001 is much safer. It uses approved D1 blocks and does not spend credits during normal full-plan generation.

Winner: Batch 001.

7. Which one is safer for production?

Batch 001 is safer because it is cached, validated, deterministic, and does not depend on a slow live model call. NVIDIA is useful, but the 132-second latency is too high for default product UX.

Winner: Batch 001.

## Recommendation

Final recommendation: **B. Use NVIDIA for optional section polish.**

Also use NVIDIA in offline/full-power mode for Batch 002 block creation. Do not import any generated Batch 002 blocks until review and approval.

Do not use NVIDIA for live full strategy by default.

Best setup:

- D1 library = main strategy brain
- NVIDIA NIM = controlled AI helper
- NVIDIA offline/full-power mode = block creation factory
- NVIDIA live = captions, hashtags, website roast, competitor analysis, and one-section polish only
- Cloudflare Pages / Functions / D1 = real deployment environment
- Vercel = old deployment reference only
- Cache = required
- Usage logging = required
- Daily limits = required
- Manual approval = required before production block imports

## Cloudflare Environment Status

Cloudflare is the real runtime for this SaaS.

Verified with Wrangler:

- Cloudflare Pages project: `cac`
- Domains shown by Wrangler: `cac-web-app.pages.dev`, `cancelagencyculture.in`
- `AI_PROVIDER`: encrypted Cloudflare Pages secret exists
- `NVIDIA_NIM_API_KEY`: encrypted Cloudflare Pages secret exists
- `NVIDIA_NIM_BASE_URL`: encrypted Cloudflare Pages secret exists
- `NVIDIA_NIM_DEFAULT_MODEL`: encrypted Cloudflare Pages secret exists
- `AI_TEST_MODE`: encrypted Cloudflare Pages secret exists
- `AI_DAILY_GLOBAL_LIMIT`: encrypted Cloudflare Pages secret exists
- `AI_DAILY_USER_LIMIT`: encrypted Cloudflare Pages secret exists
- `AI_MAX_OUTPUT_TOKENS`: encrypted Cloudflare Pages secret exists
- Local `.dev.vars`: configured and ignored by git

Verified after the Cloudflare-native code patch:

- `npm run lint`: passed
- `npm run build`: passed
- `npx wrangler pages dev out --port 8788`: served Pages Functions with the local D1 binding and `.dev.vars`
- `/api/config`: returned payments disabled and `amountInPaise: 79900`
- `/api/generate`: returned a Cartroid strategy from `generation_source: knowledge_engine`
- `/api/generate`: returned `ai_calls_count: 0`
- `/api/generate`: selected `51` strategy blocks and `3` knowledge objects
- `/api/generate-roast` with empty input: rejected before AI with `Website text is required.`
- `/api/generate-social` with weak/gibberish input: rejected before AI with `Business name, industry, and offer need real details.`
- `/api/reports`: loaded saved history without an AI call
- Direct guard test: missing provider, missing NVIDIA key, and offline profile inside request runtime all fell back safely

Frontend call-site check:

- `src/app/details/page.tsx` uses `/api/generate`, `/api/reports`, `/api/reports/save`, `/api/location-insights`, and `/api/web-insights`
- Tab switching in `src/components/StrategyWorkspace.tsx` is local React state
- PDF export in `src/components/StrategyWorkspace.tsx` uses `window.print`
- `/api/generate-roast` is only called from the homepage website roast component, not report tab switching

## Vercel Environment Status

Vercel is not the production environment for the current SaaS.

Any previous Vercel env setup should not be treated as proof of production readiness. Vercel can stay as an old deployment history/reference source only.

## Decision

NVIDIA NIM output quality is good.

The first NVIDIA runtime test took `132552ms`, which is too slow for default live full strategy.

Use NVIDIA in offline/full-power mode for block creation.

Use NVIDIA in runtime/small mode only for optional polish.

Batch 001 stays the main reference for now.

D1 library = main user strategy.

NVIDIA = content factory + optional helper.

Cloudflare = real deployment environment.

Vercel = old reference only.
