# Strategy Library Prompt Packs

These prompts are for offline block creation only.

Default product rule:

- Runtime full strategy stays DB/library-based.
- Do not call any AI model for every full user strategy.
- Use NVIDIA NIM offline to draft original action-card blocks after the small test is approved.
- Human review is required before importing blocks into local D1.
- Production D1 import needs explicit approval.

Use:

```bash
node scripts/strategy-library/generate_blocks_from_prompt.mjs --prompt prompts/strategy-library/cartroid_custom_gifts_prelaunch.md
```

That writes a review request file only.

To call NVIDIA NIM offline:

```bash
NVIDIA_NIM_API_KEY=... NVIDIA_NIM_DEFAULT_MODEL=minimaxai/minimax-m3 node scripts/strategy-library/generate_blocks_from_prompt.mjs \
  --prompt prompts/strategy-library/cartroid_custom_gifts_prelaunch.md \
  --generate \
  --model minimaxai/minimax-m3 \
  --out data/strategy-library/drafts/cartroid_custom_gifts_prelaunch.jsonl
```

After generation, the script:

1. Saves JSONL draft blocks.
2. Runs the strategy-library validator.
3. Writes a sample review markdown file.
4. Does not import into D1.
