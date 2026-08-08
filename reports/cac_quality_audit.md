# CAC Quality Audit

QUALITY AUDIT STATUS:

* TESTED

TEST METHOD:

* How the reports were generated: Local Cloudflare Pages/Functions server, `/api/dev-login` cookie, then `POST /api/generate` with `useHybrid=true` for each profile.
* Local URL/API used: `http://127.0.0.1:8801/api/generate`
* Date/time: 2026-07-02T06:33:23.451Z
* Whether source code was modified: NO
* Git diff is clean except optional QA report: NO. The working tree already had unrelated existing changes before this audit. This audit changed no source code and only wrote `reports/cac_quality_audit.md` plus raw data outside the repo at `/tmp/cac_quality_audit_raw.json`.
* AI usage observed: each generated report returned `ai_calls_count=2`, `generation_source=hybrid_ai`, and `schema_valid=true`. Each also reported fallback for failed AI items only.

PROFILE 1: SaaS / Software

* Input summary: FlowPilot; SaaS/Product; preparing to launch; Online / Global; B2B; workflow automation app access for founders and small teams; platforms Website, LinkedIn, Instagram; goals launch + leads.
* Strong parts: The output uses SaaS launch words like signup, beta, trial, demo, onboarding, activation, workflow, and founder. It gives a 30-day calendar, strategy steps, captions, templates, pain points, and growth modules. It also used hybrid AI with `ai_calls_count=2` and schema-valid output.
* Weak parts: A few fallback lines still contain cross-business placeholders. The main issue is not lack of output; it is generic repeated execution wording inside the 10-step plan.
* Wrong-context phrases found: Confirmed: “menu item” and “menus” appeared in SaaS pre-launch content. Evidence: “Show a real sample, prototype, menu item, service setup, or first draft.” and “Show real samples, mockups, menus, demos, or service examples before launch.”
* Template smell found: Confirmed repeated strategy boilerplate: “Choose one person responsible for it.” and “Check after 7 days…” appear repeatedly across strategy steps.
* Actionability score: 5/5
* Final quality score: 3/5
* Section completeness:
  - Quick Business Check: present (`scores`)
  - 30-Day Post Plan: present (`tabs.calendar`)
  - 10-Step Marketing Plan: present (`tabs.strategy`)
  - What Customers Think: present (`tabs.psychology`)
  - Example Customer Types: present (`tabs.clientPersona`)
  - Customer Problems: present (`tabs.painPoints`)
  - Competitor/Alternatives section: present (`tabs.competitors`)
  - Post Ideas: present (`tabs.ideas`)
  - Ready-to-Use Captions: present (`tabs.captions`)
  - Message Templates: present (`tabs.templates`)
  - Brand Style: present (`tabs.brandKit`)
  - Ad Result Calculator: present (`tabs.roiTool`)
  - Advanced Growth Plan: present (`tabs.premiumGrowth`)
  - Full Plan: present (`tabs.fullReport`)
  - Export PDF: export data present (`exportable_report_data` and `Export / Save`); browser PDF click was not part of this API-only audit
* Evidence snippets:
  - FlowPilot is getting ready in Online / Global. Here is the first look.
  - Write one sentence for FlowPilot: who it helps, what it sells, and why it is worth noticing in Online / Global.
  - Hi, this is FlowPilot. Tell us what you need from workflow automation app access for founders and small teams, and we will suggest the easiest first option.

PROFILE 2: Restaurant / Cafe

* Input summary: Urban Brew Calicut; local cafe/restaurant; already running; Kozhikode Beach; B2C; coffee, snacks, dine-in, takeaway, delivery; platforms Instagram, WhatsApp, Google Business; goals orders + trust.
* Strong parts: Context fit is mostly correct. It uses nearby, Google, reviews, order, visit, dine-in, takeaway, food/menu, and WhatsApp. Local language is appropriate here. Sections are complete in the generated JSON.
* Weak parts: The 30-day calendar repeats the same six topic shapes five times each, so it feels mechanical even though it is usable. The strategy steps repeat the same “owner/check after 7 days” structure.
* Wrong-context phrases found: None found from the audited wrong-context list. “menu”, “delivery”, “nearby customers”, and “Google” are contextually valid for this profile.
* Template smell found: Confirmed repeated calendar titles: “Show the problem you solve” x5, “Show one real proof point” x5, “Explain the easiest first purchase” x5, “Teach one buying tip” x5, “Compare with the usual option” x5, “Answer a common question” x5. Also repeated “Choose one person responsible…” and “Check after 7 days…”.
* Actionability score: 5/5
* Final quality score: 3/5
* Section completeness:
  - Quick Business Check: present (`scores`)
  - 30-Day Post Plan: present (`tabs.calendar`)
  - 10-Step Marketing Plan: present (`tabs.strategy`)
  - What Customers Think: present (`tabs.psychology`)
  - Example Customer Types: present (`tabs.clientPersona`)
  - Customer Problems: present (`tabs.painPoints`)
  - Competitor/Alternatives section: present (`tabs.competitors`)
  - Post Ideas: present (`tabs.ideas`)
  - Ready-to-Use Captions: present (`tabs.captions`)
  - Message Templates: present (`tabs.templates`)
  - Brand Style: present (`tabs.brandKit`)
  - Ad Result Calculator: present (`tabs.roiTool`)
  - Advanced Growth Plan: present (`tabs.premiumGrowth`)
  - Full Plan: present (`tabs.fullReport`)
  - Export PDF: export data present (`exportable_report_data` and `Export / Save`); browser PDF click was not part of this API-only audit
* Evidence snippets:
  - nearby students, families, beach visitors, and office workers usually struggle with this before choosing.
  - Kozhikode Beach does not need another confusing option. Urban Brew Calicut makes coffee, evening snacks, dine-in, takeaway, and delivery easier to understand and easier to start.
  - Hi, this is Urban Brew Calicut. Tell us what you need from coffee, evening snacks, dine-in, takeaway, and delivery, and we will suggest the easiest first option.

PROFILE 3: Dental / Clinic

* Input summary: SmileNest Dental Clinic; running local dental clinic; Mavoor Road, Kozhikode; B2C; appointments, cleaning, consultation, braces guidance, treatment plans; goals trust + bookings.
* Strong parts: The output uses patient, appointment, clinic, doctor, treatment, checkup, trust, family, and booking vocabulary. It clearly understands this is a clinic more than a product shop.
* Weak parts: Some service-business fallback language leaks into clinic output and weakens trust. The phrase “service person” is especially bad for healthcare. Some CTA wording sounds like home service rather than clinic appointment booking.
* Wrong-context phrases found: Confirmed: “Use saved replies for price, delivery, timeline, trust, and first-order questions.” is wrong for a dental clinic. Also weak: “They worry the service person may not be reliable.” and “your area… when you want it done” should be clinic timing / appointment language.
* Template smell found: Confirmed repeated calendar cycle and repeated strategy boilerplate: “Choose one person responsible…” and “Check after 7 days…”.
* Actionability score: 5/5
* Final quality score: 2/5
* Section completeness:
  - Quick Business Check: present (`scores`)
  - 30-Day Post Plan: present (`tabs.calendar`)
  - 10-Step Marketing Plan: present (`tabs.strategy`)
  - What Customers Think: present (`tabs.psychology`)
  - Example Customer Types: present (`tabs.clientPersona`)
  - Customer Problems: present (`tabs.painPoints`)
  - Competitor/Alternatives section: present (`tabs.competitors`)
  - Post Ideas: present (`tabs.ideas`)
  - Ready-to-Use Captions: present (`tabs.captions`)
  - Message Templates: present (`tabs.templates`)
  - Brand Style: present (`tabs.brandKit`)
  - Ad Result Calculator: present (`tabs.roiTool`)
  - Advanced Growth Plan: present (`tabs.premiumGrowth`)
  - Full Plan: present (`tabs.fullReport`)
  - Export PDF: export data present (`exportable_report_data` and `Export / Save`); browser PDF click was not part of this API-only audit
* Evidence snippets:
  - patients, families, parents, and adults who feel nervous about dental visits usually struggle with this before choosing.
  - Use saved replies for price, delivery, timeline, trust, and first-order questions.
  - Hi, this is SmileNest Dental Clinic. Tell us what help you need, your area in Mavoor Road, and when you want it done. We will share the next step clearly.

PROFILE 4: Agency / Service

* Input summary: NorthStar Growth Studio; marketing agency/service; early traction; Online / India; B2B; strategy, content planning, consulting, retainers; goals leads + trust.
* Strong parts: The output uses lead, enquiry, proposal, portfolio, client, and retainer language. It avoids local shop wording like walk-ins/orders in the main sampled evidence. The agency context is generally recognizable.
* Weak parts: Some wording still sounds like generic service fulfillment: “your area… when you want it done” is not great for an online agency. “Delivery” can be valid for service delivery, but repeated generic first-purchase language makes the report feel less premium.
* Wrong-context phrases found: No severe wrong-context phrase like walk-in, patients, checkout, or menu was found. Mild issue: “your area in Online / India” is awkward and should become “your business type / goal / timeline”.
* Template smell found: Confirmed repeated calendar cycle and repeated strategy boilerplate. Several calendar titles repeat five times each.
* Actionability score: 5/5
* Final quality score: 3/5
* Section completeness:
  - Quick Business Check: present (`scores`)
  - 30-Day Post Plan: present (`tabs.calendar`)
  - 10-Step Marketing Plan: present (`tabs.strategy`)
  - What Customers Think: present (`tabs.psychology`)
  - Example Customer Types: present (`tabs.clientPersona`)
  - Customer Problems: present (`tabs.painPoints`)
  - Competitor/Alternatives section: present (`tabs.competitors`)
  - Post Ideas: present (`tabs.ideas`)
  - Ready-to-Use Captions: present (`tabs.captions`)
  - Message Templates: present (`tabs.templates`)
  - Brand Style: present (`tabs.brandKit`)
  - Ad Result Calculator: present (`tabs.roiTool`)
  - Advanced Growth Plan: present (`tabs.premiumGrowth`)
  - Full Plan: present (`tabs.fullReport`)
  - Export PDF: export data present (`exportable_report_data` and `Export / Save`); browser PDF click was not part of this API-only audit
* Evidence snippets:
  - founders, small business owners, and startup teams usually struggle with this before choosing.
  - Write one sentence that explains why NorthStar Growth Studio is a better choice for founders, small business owners, and startup teams.
  - Hi, this is NorthStar Growth Studio. Tell us what help you need, your area in Online / India, and when you want it done. We will share the next step clearly.

PROFILE 5: Ecommerce / D2C

* Input summary: ThreadLoop; ecommerce clothing/D2C; launch and early growth; India; young online shoppers; casual shirts/tops sold online; platforms Instagram, Website, WhatsApp; goals orders + trust.
* Strong parts: The output uses product, checkout, delivery, first purchase, reviews, size, order, real product videos, and WhatsApp. Product-trust language is good and actionable.
* Weak parts: Local-business Google wording leaks into online ecommerce. The 30-day plan also repeats the same six content angles, so the output feels less custom than it should.
* Wrong-context phrases found: Confirmed: “Can nearby customers find you on Google?” and “Make nearby customers find you” are wrong for online D2C unless the brand also has a local storefront. It should say shoppers/find product/search/website instead.
* Template smell found: Confirmed repeated calendar cycle and repeated strategy boilerplate: “Choose one person responsible…” and “Check after 7 days…”.
* Actionability score: 5/5
* Final quality score: 2/5
* Section completeness:
  - Quick Business Check: present (`scores`)
  - 30-Day Post Plan: present (`tabs.calendar`)
  - 10-Step Marketing Plan: present (`tabs.strategy`)
  - What Customers Think: present (`tabs.psychology`)
  - Example Customer Types: present (`tabs.clientPersona`)
  - Customer Problems: present (`tabs.painPoints`)
  - Competitor/Alternatives section: present (`tabs.competitors`)
  - Post Ideas: present (`tabs.ideas`)
  - Ready-to-Use Captions: present (`tabs.captions`)
  - Message Templates: present (`tabs.templates`)
  - Brand Style: present (`tabs.brandKit`)
  - Ad Result Calculator: present (`tabs.roiTool`)
  - Advanced Growth Plan: present (`tabs.premiumGrowth`)
  - Full Plan: present (`tabs.fullReport`)
  - Export PDF: export data present (`exportable_report_data` and `Export / Save`); browser PDF click was not part of this API-only audit
* Evidence snippets:
  - young online shoppers and college students usually struggle with this before choosing.
  - product in use
  - Check the real product video before ordering.

GLOBAL FINDINGS:

* What CAC already does well:
- It creates a real Marketing OS sized output, not a tiny report.
- All five generated reports had broad section coverage and schema-valid JSON.
- Hybrid AI is active in local generation: all five profiles showed `ai_calls_count=2`.
- The app mostly changes vocabulary by business model: SaaS gets signup/demo/workflow language, local cafe gets nearby/Google/order language, clinic gets patient/appointment language, agency gets leads/proposals, ecommerce gets product/checkout/delivery language.
- The output is practical enough for a non-technical owner to start doing things immediately.

* What must not be changed:
- Do not reduce the number of sections or output volume.
- Do not remove the simple card language.
- Do not break saved report/workspace JSON or PDF/export data.
- Do not replace the current architecture; the weaknesses are wording/context quality issues, not proof that the system needs a rebuild.

* Biggest quality gaps:
- The 30-day calendar repeats six topic shapes five times in multiple profiles. This is the biggest template smell.
- The 10-step strategy repeatedly uses “Choose one person responsible…” and “Check after 7 days…”, which makes the plan feel assembled.
- Some fallback wording is too broad: SaaS got “menu item/menus”; clinic got “delivery/first-order/service person”; ecommerce got “nearby customers/Google”.
- AI attempted enhancement but still fell back for failed items, so the current quality gate is catching issues but not fully removing all visible weak language.

* Highest-impact smallest fixes:
- Must fix: narrow context phrase guards for SaaS menu words, clinic delivery/service-person wording, and online ecommerce nearby-customer Google wording.
- Should fix: vary the 30-day calendar titles so it does not visibly repeat the same six topic labels.
- Should fix: vary or remove repeated strategy step boilerplate like “Choose one person responsible” and “Check after 7 days”.
- Nice to fix: make message templates more context-specific for clinic and agency instead of using generic “tell us what help you need / your area / when you want it done”.

* Features that should be preserved exactly:
- `/api/generate` hybrid route and returned JSON contract.
- Auth-gated strategy generation.
- Saved workspace/report behavior.
- Full tabs/cards/exportable report structure.
- Simple beginner language and action-card style.

FINAL VERDICT:
USEFUL BUT TOO GENERIC — QUALITY FIX NEEDED
