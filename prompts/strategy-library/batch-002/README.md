# Batch 002 Offline NVIDIA Draft Prompts

Batch 002 is for draft generation only.

Rules:

- Use `AI_TASK_PROFILE=offline_block_generation`.
- Generate one group at a time, but create that group in small slices when the provider is slow.
- Save JSONL drafts only.
- Validate, render a sample, and create review markdown after each group.
- Do not import to production D1.
- Do not mark blocks active until reviewed and approved.
- If a 50-block or 25-block call times out, use 3-5 card slices and merge only reviewed passing slices.

Recommended command pattern:

```bash
AI_TASK_PROFILE=offline_block_generation AI_OFFLINE_MAX_OUTPUT_TOKENS=8000 AI_OFFLINE_TIMEOUT_MS=420000 \
node scripts/strategy-library/generate_blocks_from_prompt.mjs \
  --prompt prompts/strategy-library/batch-002/group-01-salon.md \
  --count 3 \
  --max-tokens 1800 \
  --draft-schema batch002 \
  --group salon \
  --avoid data/strategy-library/drafts/batch-002-group-01-salon-reviewed-starter.jsonl \
  --generate \
  --out data/strategy-library/drafts/batch-002-group-01-salon-slice-01.jsonl
```

After generation:

1. Validate JSON.
2. Check banned words.
3. Check duplicate ideas.
4. Check wrong-business mixing.
5. Render sample output.
6. Create review markdown.
7. Wait for approval.

Merge passing slices only:

```bash
node scripts/strategy-library/merge_batch002_slices.mjs \
  --group salon \
  --out data/strategy-library/drafts/batch-002-group-01-salon-reviewed-starter.jsonl \
  data/strategy-library/drafts/batch-002-group-01-salon-slice-03.jsonl \
  data/strategy-library/drafts/batch-002-group-01-salon-slice-04-selected.jsonl
```

If a generated slice has one good card and two repeated/weak cards, select only the good card:

```bash
node scripts/strategy-library/select_batch002_blocks.mjs \
  --group salon \
  --out data/strategy-library/drafts/batch-002-group-01-salon-slice-04-selected.jsonl \
  --id salon_002_001 \
  data/strategy-library/drafts/batch-002-group-01-salon-slice-04.jsonl
```

Preferred curation command:

```bash
node scripts/strategy-library/curate_batch002_slice.mjs \
  --group salon \
  --base data/strategy-library/drafts/batch-002-group-01-salon-reviewed-starter.jsonl \
  --slice data/strategy-library/drafts/batch-002-group-01-salon-slice-07.jsonl \
  --accepted-out data/strategy-library/drafts/batch-002-group-01-salon-slice-07-selected.jsonl
```

Current provider note:

- 50-block and 25-block salon calls timed out.
- A 3-block slice completed after the offline timeout was increased.
- Slice 01 passed the first structural gate, then failed the stricter quality gate after the validator was improved.
- Slice 02 used the improved prompt but still failed because copy was too long, tag values were hyphenated, and examples invented customer reactions.
- Slice 03 passed and contributed 3 draft blocks.
- Slice 04 passed individually after validator fixes, but only 1 block was selected because the other 2 repeated earlier ideas.
- Slice 06 focused on customer problem, Instagram before/after proof, and repeat reminders; 3 blocks accepted.
- Slice 07 focused on service menu, first-time offer, and Google Business content; 3 blocks accepted.
- Slice 08 focused on stylist consultation proof, late-slot WhatsApp handling, and aftercare instructions; 3 blocks accepted after manual polish.
- Slice 09 focused on bridal trial setup, walk-in to booking, and no-show/reschedule handling; 3 blocks accepted after manual polish.
- Slice 10 focused on student offers, family package planning, and men grooming; 2 blocks accepted by curator and 1 clean men-grooming card added after manual polish.
- Current reviewed starter file: `data/strategy-library/drafts/batch-002-group-01-salon-reviewed-starter.jsonl`
- Current reviewed starter count: 19 blocks.
- Next generation should use the current stricter request in `reports/strategy-library-drafts/group-01-salon-request.md` with the reviewed starter file passed through `--avoid`.
