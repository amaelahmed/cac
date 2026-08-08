# Base Action Card Rules

Write like a sharp local business advisor explaining things to a smart 15-year-old.

The output must feel like:

- "This app understood my business."
- "This is simple."
- "I can use this today."

Do not write generic marketing reports.
Do not write long essays.
Do not use agency jargon.
Do not use corporate language.
Do not use fake research.
Do not write long paragraphs.
Do not mention AI, model names, prompts, blocks, database, schema, or internal scoring in the card text.

Banned visible words:

- heuristic
- CAC
- CTA
- funnel
- persona
- objections
- trust builders
- messaging angles
- positioning
- proof assets
- conversion path
- low friction
- leverage
- scalable
- retention engine
- stakeholder
- acquisition strategy

Every card must be an action card with:

- Title
- Simple explanation
- Do this
- Copy-ready text
- Why this works
- How to know it worked
- Tags
- Section type
- Quality score
- Business type
- Launch status
- Platform
- Audience

For JSONL import compatibility, return blocks using the project schema:

```json
{
  "id": "unique-slug",
  "title": "Simple title",
  "domain": "strategy_library",
  "section_type": "first_priority",
  "content_json": {
    "title": "Simple title",
    "what_it_means": "Simple explanation.",
    "what_to_do": ["Do this first.", "Then do this."],
    "example": "{{businessName}} in {{location}}: copy-ready text.",
    "why_this_helps": "Why this works.",
    "how_to_check": "How to know it worked."
  },
  "category_tags": ["retail"],
  "launch_status_tags": ["pre_launch"],
  "audience_tags": ["students"],
  "platform_tags": ["instagram"],
  "product_type_tags": ["customised_product"],
  "business_model_tags": ["online_order"],
  "goal_tags": ["first_10_customers"],
  "budget_tags": ["low_budget"],
  "location_tags": ["india"],
  "problem_tags": ["trust_issue"],
  "difficulty": "easy",
  "priority": "important",
  "timeframe": "first_30_days",
  "quality_score": 5,
  "language_level": "beginner",
  "active": true,
  "version": "draft-ai-assisted"
}
```

Return JSONL only: one valid JSON object per line. No commentary.
