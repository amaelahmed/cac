# Cartroid Preview: Old vs New

This compares the previous deterministic Cartroid output with the new local preview output wired to the 51-block strategy library batch.

## Preview Status

- Environment: local Pages preview
- URL tested: http://localhost:8796/details/
- Local D1 only: yes
- Production D1 import: no
- Strategy library candidates: 51
- Strategy library blocks selected: 51
- Calendar days shown: 30
- AI calls for main strategy: 0

## First Strategy Action

Old:

- Title: Tell people why they should choose you in one sentence
- Reason: This matters because Cartroid needs people in Kozhikode to understand and trust it before launch.

New:

- Title: Make five sample products before asking for orders
- Reason: I picked this because custom products need real examples before customers trust the order.
- Example: Cartroid can make five sample Customised gifts and trendy products for birthdays, farewell gifts, best friends, couples, and college events in Kozhikode.

Why this is better:

- It is more specific to a pre-launch custom product store.
- It gives a concrete task the owner can do today.
- It avoids exposing tags like pre_launch or gen_z.

## Calendar Day 1

Old:

- Topic: First look at the product style
- Caption: Custom gifts are coming to Kozhikode. Send us a name or photo idea and we will show what can be made.
- Reason: People quickly understand what you make.

New:

- Topic: First look at Cartroid
- Caption: Kozhikode, something unique is coming. Customised products made easy. Send your idea, see a preview, and confirm before we make it.
- Reason: This helps because people need to understand what Cartroid sells before opening day.

## Calendar Day 10

Old:

- Topic: What happens if something is wrong
- Caption: We confirm the design before making it. If our side makes a mistake, we fix it clearly.
- Reason: Policy clarity makes advance payment easier.

New:

- Topic: Starting price clarity
- Caption: Cartroid in Kozhikode: No guessing. Here is how price changes by size, detail, and delivery.
- Reason: This helps because students and gen-z buyers may avoid messaging if they think the product will be too expensive.

## UI Smoke Result

Passed:

- Pre-launch monthly sales field hidden.
- Pre-launch business age field hidden.
- Marketing Plan shows the library action "Make five sample products before asking for orders".
- Strategy reason is natural, not raw tag text.
- Calendar modal shows a day-specific reason.
- No raw "matches pre launch, customised products..." wording.
- No visible AI calls, Objects, Export JSON, Saved to history, or B2C labels.
- No browser console errors during the smoke test.

Artifacts:

- Screenshot: `reports/cartroid_preview_ui.png`
- Smoke check JSON: `reports/cartroid_preview_ui_check.json`
