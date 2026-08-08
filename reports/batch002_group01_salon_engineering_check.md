# Batch 002 Group 01 Salon Engineering Check

Date: 2026-06-29

Goal: create reviewed NVIDIA-assisted draft action cards for salon businesses without importing anything into D1.

## Current Status

Group 01 is not approved and not complete.

No generated Batch 002 salon block has been imported into D1.

## Pipeline Added

- Batch 002 authoring validator: `scripts/strategy-library/validate_batch002_drafts.mjs`
- Batch 002 draft prompt base: `prompts/strategy-library/_batch002_action_card_prompt.md`
- Generator now auto-uses `batch002` draft schema for `prompts/strategy-library/batch-002/*`
- Generator now writes review markdown and sample markdown for generated drafts
- Offline timeout is configurable with `AI_OFFLINE_TIMEOUT_MS`
- Runtime profile remains short and separate from offline generation

## NVIDIA Generation Attempts

1. 50 salon blocks

- Output file target: `data/strategy-library/drafts/batch-002-group-01-salon.jsonl`
- Result: aborted before output
- Decision: too large for the current model/runtime behavior

2. 25 salon blocks

- Output file target: `data/strategy-library/drafts/batch-002-group-01-salon-part-a.jsonl`
- Result: aborted before output
- Decision: still too large

3. 5 salon blocks

- Output file target: `data/strategy-library/drafts/batch-002-group-01-salon-slice-01.jsonl`
- Result: aborted before output with the previous offline timeout
- Decision: add configurable longer offline timeout

4. 3 salon blocks, first completed slice

- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-01.jsonl`
- Review file: `reports/strategy-library-drafts/group-01-salon-review.md`
- Initial validation: passed
- Manual inspection: rejected
- Reason: invented exact prices and fake-looking performance/customer reaction claims were still possible

5. 3 salon blocks, stricter prompt

- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-02.jsonl`
- Review file: `reports/strategy-library-drafts/group-01-salon-review.md`
- Strict validation: failed
- Problems:
  - `copy_ready_text` too long
  - `domain`, `section_type`, and tag values used hyphenated labels instead of lower snake case
  - examples invented customer reactions or results

6. 3 salon blocks, allowed-values prompt

- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-03.jsonl`
- Review file: `reports/strategy-library-drafts/batch-002-group-01-salon-slice-03-review.md`
- Strict validation: passed
- Blocks accepted into draft starter set: 3

7. 3 salon blocks with avoid-list

- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-04.jsonl`
- Review file: `reports/strategy-library-drafts/batch-002-group-01-salon-slice-04-review.md`
- Individual validation after false-positive fix: passed
- Combined merge with slice 03: failed because it repeated the hygiene-cleaning idea
- Manually selected unique card: `salon_002_001`
- Selected output: `data/strategy-library/drafts/batch-002-group-01-salon-slice-04-selected.jsonl`

8. Current clean starter merge

- Combined output: `data/strategy-library/drafts/batch-002-group-01-salon-reviewed-starter.jsonl`
- Group review: `reports/strategy-library-drafts/batch-002-group-01-salon-reviewed-starter-group-review.md`
- Blocks: 4 at this checkpoint
- Validation: passed
- Import status: not imported, manual approval required

9. Focused missing-section slice

- Focus: `customer_problem_card`, `instagram_content_card`, `repeat_visit_card`
- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-06.jsonl`
- Curated output: `data/strategy-library/drafts/batch-002-group-01-salon-slice-06-selected.jsonl`
- Accepted: 3
- Rejected: 0
- Current merged starter count after merge: 7

10. Focused service/menu/Google slice

- Focus: `service_menu_card`, `simple_offer_card`, `google_business_card`
- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-07.jsonl`
- Curated output: `data/strategy-library/drafts/batch-002-group-01-salon-slice-07-selected.jsonl`
- Accepted: 3
- Rejected: 0
- Current merged starter count after merge: 10

11. Focused staff/delay/aftercare slice

- Focus: `stylist_trust_card`, `delay_message_card`, `aftercare_card`
- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-08.jsonl`
- Curated output: `data/strategy-library/drafts/batch-002-group-01-salon-slice-08-selected.jsonl`
- Accepted after manual polish: 3
- Rejected: 0
- Manual polish removed `local_salon` domain wording and invented customer reaction language
- Current merged starter count after merge: 13

12. Focused bridal/walk-in/no-show slice

- Focus: `bridal_trial_card`, `walk_in_booking_card`, `no_show_policy_card`
- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-09.jsonl`
- Curated output: `data/strategy-library/drafts/batch-002-group-01-salon-slice-09-selected.jsonl`
- Accepted after manual polish: 3
- Rejected: 0
- Manual polish removed invented outcomes from examples and made measurement language safer
- Current merged starter count after merge: 16

13. Focused student/family/men grooming slice

- Focus: `student_offer_card`, `family_package_card`, `men_grooming_card`
- Output file: `data/strategy-library/drafts/batch-002-group-01-salon-slice-10.jsonl`
- Curated output: `data/strategy-library/drafts/batch-002-group-01-salon-slice-10-selected.jsonl`
- Accepted by curator: 2
- Rejected by curator: 1
- Manual polish added a clean `men_grooming_card` and tightened student/family measurement wording
- Current merged starter count after merge: 19

## Current Reviewed Starter

- File: `data/strategy-library/drafts/batch-002-group-01-salon-reviewed-starter.jsonl`
- Review: `reports/strategy-library-drafts/batch-002-group-01-salon-reviewed-starter-group-review.md`
- Blocks: 19
- Validation: passed
- Import status: not imported, manual approval required

Current section coverage:

- `hygiene_proof_card`: 1
- `whatsapp_reply_card`: 1
- `review_request_card`: 1
- `booking_trust_card`: 1
- `customer_problem_card`: 1
- `instagram_content_card`: 1
- `repeat_visit_card`: 1
- `service_menu_card`: 1
- `simple_offer_card`: 1
- `google_business_card`: 1
- `stylist_trust_card`: 1
- `delay_message_card`: 1
- `aftercare_card`: 1
- `bridal_trial_card`: 1
- `walk_in_booking_card`: 1
- `no_show_policy_card`: 1
- `student_offer_card`: 1
- `family_package_card`: 1
- `men_grooming_card`: 1

## Current Quality Gate

The latest validator checks:

- valid JSONL
- required Batch 002 action-card fields
- non-empty tags
- lower snake case for `domain`, `section_type`, and tag values
- group-specific allowed domains, such as `salon` for salon blocks
- banned words
- duplicate IDs, titles, and idea signatures
- wrong-business mixing
- no fixed invented prices
- no fake performance claims or invented results
- no invented customer outcomes in examples or measurement text
- reusable placeholder or safe generic wording
- short `copy_ready_text`
- lower snake case for tags, `domain`, and `section_type`
- near-duplicate ideas across merged slices

After the validator was tightened, the polished reviewed starter still passed with 16 blocks. The old raw slice 08 and raw slice 09 now fail validation, which means future weak NVIDIA drafts should be rejected earlier instead of requiring the same manual cleanup later.

## Helper Scripts Added

- `scripts/strategy-library/merge_batch002_slices.mjs`
- `scripts/strategy-library/select_batch002_blocks.mjs`
- `scripts/strategy-library/curate_batch002_slice.mjs`

The merge script refuses invalid slices and re-validates the combined group file. The selector script lets a reviewer extract only good block IDs from a mixed-quality generated slice. The curator script tests each generated card against the current reviewed starter and accepts only cards that keep the combined group valid.

## Latest Request File

The current strict request is:

`reports/strategy-library-drafts/group-01-salon-request.md`

Use that request for the next small salon slice.

## Recommendation

Do not try 50-block NVIDIA calls with the current model.

Use 3-card slices with `--avoid data/strategy-library/drafts/batch-002-group-01-salon-reviewed-starter.jsonl` and `--focus` instructions for missing section/problem coverage until Group 01 reaches 50 clean draft blocks. Curate every slice against the reviewed starter before merge. After enough slices pass, create a combined review file for Group 01 and wait for approval before any import conversion.

If the next 2-3 strict slices still fail, switch `NVIDIA_NIM_DEFAULT_MODEL` to a faster/better structured-output model and rerun the same strict request.
