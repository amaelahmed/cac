# Base Action Card Rules

Write like a sharp local business advisor explaining things to a smart 15-year-old.

The output must feel like:

- "This app understood my business."
- "This is simple."
- "I can use this today."

Do not write generic marketing reports.
Do not write long essays.
Do not use agency jargon.
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

Return only valid JSON array or JSONL. No commentary.


# Prompt Pack: Cartroid-Style Custom Gifts Pre-Launch

Create excellent original action-card blocks for a pre-launch customised gift/product store.

Business pattern:

- Local city: Kozhikode / Calicut
- Audience: students, Gen-Z, friend groups, birthday/farewell buyers
- Platforms: Instagram, WhatsApp, Google Business
- Stage: pre-launch
- Product: customised gifts, photo/name products, small personal gifts
- Budget: low or organic
- Main problems: unknown brand, quality doubt, price doubt, delivery doubt, custom mistakes, unclear order process

Create blocks for:

- first priority actions
- Instagram actions
- WhatsApp messages
- Google Business actions
- customer questions
- customer problems
- competitor cards
- growth opportunity cards
- advanced growth cards
- measurement cards
- 30-day calendar cards

Make every card specific to custom gifts. Include preview before making, spelling check, material close-up, delivery/pickup, first 10 test orders, launch countdown, price clarity, WhatsApp ordering, student-friendly examples, and local Kozhikode context.



Create 3 draft blocks.

Important:
- Return only valid JSON array or JSONL.
- Every block must use the project schema exactly.
- Every content_json.example must include {{businessName}} or {{location}}.
- Every block must be original.
- Do not include production import SQL.
- Do not include comments.
