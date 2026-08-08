# Strategy Library Pipeline

This library has two separate jobs:

1. Create and approve a large library of original strategy blocks.
2. Fetch only the few blocks that match one business profile.

The app must not scrape random internet content, paste copied rows, or call a live AI model for every full strategy report.

## Content Creation

The final target is around 2000 active high-quality blocks. Draft, rejected, duplicate, weak, or tiny variation rows do not count.

The creation pipeline is:

1. Generate original draft blocks offline in focused batches.
2. Store each batch as JSONL seed files.
3. Validate every block with the quality script.
4. Reject banned words, duplicate ideas, thin examples, and generic advice.
5. Review the first 50-100 blocks manually.
6. Import only approved blocks into D1.
7. Track every import batch with counts and quality results.

The first milestone focuses on Cartroid-type businesses:

- pre-launch businesses
- customised product businesses
- retail/product stores
- Instagram marketing
- WhatsApp ordering
- Google Business/local search
- first 10 customers
- first 30 customers
- students/Gen-Z
- Kozhikode/Calicut/local context
- things that make customers trust the business
- 30-day calendar
- ready captions
- WhatsApp messages

## Source Of Blocks

The blocks may be AI-assisted offline, then reviewed. They must be original and written for this product.

Allowed:

- AI-assisted offline drafting
- Human editing
- Local business reasoning
- Original examples written for small businesses

Not allowed:

- Scraped internet rows
- Copied blog/social content
- Unreviewed AI dumps
- Live AI full-report generation for every user
- Weak rows added only to increase the count

## Required Block Shape

Every major block must include:

- What to do
- Why it matters
- Example for this business
- How to know if it worked
- Why we suggest this, generated from matching tags

Calendar blocks must also include:

- Day
- Post type
- Topic
- What to show
- Ready caption
- Why this helps
- Customer action
- Why we suggest this

## Quality Gates

The validator must reject or warn on:

- banned marketing words
- duplicate IDs
- duplicate calendar topics
- repeated ideas
- active blocks below quality score 4
- missing examples
- examples without business or location context
- pre-launch blocks that talk like the business already has customers
- customised product blocks that miss preview, approval, payment, delivery time, final photo, mistakes, material, making, packaging, or WhatsApp ordering context
- thin or vague content

## Runtime Retrieval

The app must not fetch all 2000 blocks for a strategy report.

The backend converts business details into tags, then queries a limited candidate set from D1:

- `active = 1`
- `quality_score >= 4`
- `language_level = 'beginner'`
- matching section types for the report
- at least one strong tag match where possible

Then it scores and selects the best blocks by section.

Typical report size:

- Simple summary: 3 blocks
- First priority: 3 blocks
- Customer questions: 8 blocks
- Things that make customers trust the business: 8 blocks
- Instagram actions: 8 blocks
- WhatsApp messages: 8 blocks
- 7-day plan: 7 blocks
- 30-day calendar: 30 blocks
- Captions: 10 blocks
- Measurement: 5 blocks

That means a normal report uses about 60-100 selected blocks, not the full library.

## Retrieval Weights

High:

- launch status match
- customised product match
- category match
- audience match
- goal match

Medium:

- platform match
- location match
- problem match
- business model match

Boost:

- quality score 5
- urgent or important priority
- easy difficulty

Penalty:

- weak or generic content
- repeated topic
- section overuse

## Cartroid Example Tags

For a pre-launch customised product store in Kozhikode targeting students/Gen-Z, the system should look for:

- `pre_launch`
- `retail`
- `customised_products`
- `customised_product`
- `students`
- `gen_z`
- `kozhikode`
- `calicut`
- `instagram`
- `whatsapp`
- `first_10_customers`
- `first_30_customers`
- `trust_issue`
- `unclear_order_process`
- `price_confusion`
- `delivery_doubt`

## Answers To The Pipeline Questions

A. The 2000 blocks will be AI-assisted offline plus human reviewed, not scraped or generated live per user.

B. Originality is protected by requiring original seed files, blocking scraped imports, and checking for repeated wording/ideas before import.

C. Duplicate ideas are checked by ID, calendar topic, normalized title, normalized action, and repeated content signature.

D. Banned marketing words are checked by the validator before import.

E. Every major block must have a real example using business or location context.

F. Sample review happens through generated reports before import, starting with the first 50-100 blocks.

G. Each strategy report should fetch a capped candidate set, then select around 60-100 final blocks.

H. Final output avoids repeated advice through section quotas, duplicate topic checks, repeated content penalties, and a final dedupe pass.
