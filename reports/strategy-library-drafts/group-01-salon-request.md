# Batch 002 Action Card Draft Rules

SYSTEM:
You are creating strategy-library blocks for a Cloudflare SaaS that helps small local businesses in India.

Write like a smart business assistant.
Very simple English.
No marketing jargon.
No corporate language.
No long paragraphs.
No fake research.
No raw tags.
No confusing theory.
No invented prices.
No invented statistics.
No fake performance claims.
Use placeholders like `{{businessName}}`, `{{location}}`, `{{startingPrice}}`, or `{{serviceName}}` when the card needs a business name, city, price, or service.
Use lower_snake_case for `domain`, `section_type`, and every tag value.
Keep `copy_ready_text` under 320 characters.
If one card needs multiple reply templates, split them into separate cards.
In `example_for_business`, describe how the business would use the card. Do not invent customer reactions, shares, saves, bookings, sales, or review results.

Every block must make the user feel:
"I understand this."
"This is about my business."
"I can do this today."

Return JSONL only.
One valid JSON object per line.

Each block must be original, practical, and specific.

Do not use:
heuristic, CAC, CTA, funnel, persona, objections, trust builders, messaging angles, positioning, proof assets, conversion path, low friction, retention engine, leverage, scalable.

Each block must include:

```json
{
  "id": "",
  "title": "",
  "domain": "",
  "section_type": "",
  "business_type": "",
  "launch_status": "",
  "simple_explanation": "",
  "do_this": [],
  "copy_ready_text": "",
  "example_for_business": "",
  "why_this_works": "",
  "how_to_know_it_worked": "",
  "tags": {
    "category": [],
    "launch_status": [],
    "audience": [],
    "platform": [],
    "product_type": [],
    "goal": [],
    "location": [],
    "problem": []
  },
  "quality_score": 5,
  "language_level": "beginner"
}
```

Every block must be an action card, not a report paragraph.
Every block must be reusable for many businesses in the same category after placeholders are filled.


# Batch 002 Group 01: Salon Blocks

Generate draft blocks for running and early-stage local salons in India.

Business type: salon / beauty studio / grooming studio

Business context:

- Location: Indian local markets, including Kerala cities like Kozhikode
- Customers: women, students, brides, working professionals, families, men for grooming where relevant
- Platforms: Instagram, WhatsApp, Google Business
- Goals: bookings, trust, repeat visits, first-time offers, local discovery, reviews
- Budget: low to medium
- Common fears: hygiene, price surprise, bad haircut, skin reaction, late appointments, untrained staff

Required sections:

- booking trust cards
- hygiene proof cards
- Instagram reels/posts
- WhatsApp replies
- customer problem cards
- Google Business/review cards
- repeat visit cards
- offer cards
- staff/stylist trust cards
- late appointment and delay message cards
- aftercare cards
- bridal/event preparation cards
- walk-in to booking cards
- no-show and reschedule cards
- student/family/men grooming cards
- referral cards
- festival and event rush booking cards
- local discovery cards

Allowed `section_type` values:

- booking_trust_card
- hygiene_proof_card
- instagram_content_card
- whatsapp_reply_card
- customer_problem_card
- google_business_card
- repeat_visit_card
- simple_offer_card
- review_request_card
- service_menu_card
- stylist_trust_card
- delay_message_card
- aftercare_card
- bridal_trial_card
- walk_in_booking_card
- no_show_policy_card
- student_offer_card
- family_package_card
- men_grooming_card
- local_discovery_card
- referral_card
- festival_booking_card
- event_rush_card
- nearby_search_card
- instagram_story_card
- staff_intro_card

Use these tag values where relevant:

- category: salon, beauty_studio, grooming_studio
- launch_status: running, early_stage
- audience: women, students, brides, working_professionals, families, men
- platform: instagram, whatsapp, google_business, in_store
- product_type: service, beauty_service, grooming_service, bridal_service, hair_service, skincare_service
- goal: bookings, trust, repeat_visits, first_time_offers, local_discovery, reviews, staff_trust, better_scheduling, aftercare, event_prep, referrals, festival_bookings, story_engagement
- location: india, kerala, kozhikode, local_market
- problem: hygiene_fear, price_surprise, bad_result_fear, skin_reaction_fear, late_appointment, untrained_staff_fear, slow_reply, aftercare_confusion, walk_in_confusion, no_show, bridal_trial_fear, first_visit_fear, low_referrals, festival_rush, nearby_search_confusion, inactive_instagram

Do not mix advice from cafes, clothing stores, software, or gift shops.

Do not invent customer results.
Do not write "bookings went up", "customers shared", "customers saved", or "one customer booked" unless the business owner measured it.
Examples should describe the setup only, not imaginary outcomes.
For staff/stylist proof, show training, experience, tool setup, or consultation process without saying the person is the best.
For delay and scheduling cards, give a respectful message that protects trust instead of hiding the delay.
For aftercare cards, give simple care instructions and when to contact the salon.
For referral cards, make the ask polite and trackable without promising rewards the salon cannot afford.
For festival/event cards, manage limited slots honestly without fake urgency.
For local discovery cards, focus on Google Business, nearby landmarks, and simple location clarity.


Avoid repeating these existing approved draft ideas:
- Show your cleaning routine in a short video: A 30-second video of how you clean tools and chairs removes the main fear customers have before visiting. Film your staff wiping the chair, swapping towels, and dipping tools in sanitiser before a customer sits. Add a small caption on the video: 'How we clean before every customer at {{businessName}}.'
- Reply fast on WhatsApp with a clear price list: When customers ask 'How much?', they want a clear answer in one message. A ready price list saves you time and stops the price surprise fear. Save a price list on your phone with service name and starting price like {{startingPrice}}. Open WhatsApp Business and put the list in Catalogue so it is one tap away.
- Ask for a Google review right after the service: A short friendly ask at the right moment helps you collect real Google reviews from customers who already had a good visit. Pick a happy customer right after the service ends and before she pays. Say the review line below and show the Google Maps page on your phone.
- WhatsApp booking message that confirms time and seat: When a customer asks for a slot on WhatsApp, reply fast with the time, the service, and the seat. This stops double-bookings and calms the fear of waiting. Open WhatsApp Business and keep the chat reply short. Type the service name, the time slot, and ask 'Shall I fix this for you?'
- Show your patch test and fix-it plan for skin fear: Many customers worry their skin will react to a new product. A short, clear message about your patch test and safety step calms them before they book. Add one line on your WhatsApp catalogue: 'Tell us if you had any skin reaction before.' Keep your patch-test step written near the billing counter so staff repeat it the same way.
- Post a real before-and-after with a clear honest caption: A real before-and-after photo with a simple honest caption builds trust. No filters, no number claims, just the work and the steps you used. Ask the customer if you can share her photo. Only post after she says yes. Take two photos in the same spot and same light: one before, one after.
- Send a simple next-visit reminder on WhatsApp: A short WhatsApp message after the service tells the customer when to come back. It keeps you in her mind without being pushy. After the customer pays, note the next visit date in a small diary or phone note. Save a reminder message on WhatsApp Business as a quick reply.
- Show your 5 main services in one simple menu: Customers want to know what you offer and how much it costs before they walk in. A simple menu with your 5 main services removes confusion and stops price questions. Pick your 5 most asked services like haircut, facial, waxing, threading, and hair colour. Write each service name in simple English and your local language.
- Simple first-time visitor offer without fake urgency: A small, honest offer for first-time visitors helps new customers try your salon without feeling trapped. No countdown timers, no fake hurry. Pick one service for the first-time offer, like a basic haircut or simple facial. Keep the offer open all week, not just for 2 hours.
- Add real service photos and service list to Google Business: When people search 'salon near me' on Google, your photos and service list are the first thing they see. Real photos of your work help them pick you over the next shop. Open your Google Business profile on your phone. Go to the Photos section and upload 8 to 10 real photos of your salon, your staff working, and finished work like haircuts and facials.
- Show the consultation step before the service starts: A short consultation before the service helps the customer feel heard. It shows your stylist listens and plans before starting. Before any haircut or colour, ask the customer three questions: what length, what look, and any past hair problem. Write the answers in a small notepad near the chair.
- Send a polite WhatsApp message when the slot is late: When your chair or stylist is running late, a quick honest WhatsApp message keeps trust. Hiding the delay makes customers more upset. Send the message as soon as you know the delay. Keep it short: sorry, reason, new time, and a choice.
- Send simple aftercare steps after the service: Customers forget what to do at home after a facial, colour, or styling service. A short written note reduces confusion. Pick the three services that need aftercare, like hair colour, facial, or styling. Write three simple aftercare points for each service.
- Book a bridal makeup trial the simple way: A trial visit lets the bride see the look before the wedding day. It also gives time to check style, timing, and skin comfort. Set one fixed trial slot per week so you are not rushed. Ask the bride to bring one or two reference photos on her phone.
- Turn a walk-in into a fixed booking for a longer service: Walk-in customers may ask for long services like colour, smoothening, or bridal prep. A fixed slot protects their time and your chair. Ask which service the walk-in customer wants. Check how much chair and stylist time the service needs.
- Send a polite message when a customer misses an appointment: When a customer misses a slot, a polite message keeps the relationship open and helps you free the chair without sounding angry. Wait 15 minutes after the slot time before messaging. Send one short WhatsApp asking if the customer is still coming.
- Simple weekday student offer with clear ID check: Students want a fair price but may feel shy to ask. A simple weekday offer with a clear ID check makes the offer feel fair and respectful. Pick one weekday like Tuesday or Wednesday for the student offer. Choose one service like basic haircut, simple cleanup, or threading.
- Mother-daughter family visit plan with set services and timing: Families often want to visit together but worry about long waits. A simple family plan with services and timing makes the visit easier to understand. Pick two services that work well together, like haircut for mom and simple facial for daughter. Set a fixed family slot on a slow day like a weekday afternoon.
- Show men grooming hygiene before booking: Men trying a grooming studio for the first time may worry about hygiene, bad cuts, or unclear prices. A simple card shows the setup before they visit. List three main men services like haircut, beard trim, and clean shave with starting price {{startingPrice}}. Take three photos: clean tools on a tray, fresh towel, and chair cleaning.


For this slice, focus only on:
- one referral_card about politely asking a happy salon customer to refer a friend, with a trackable but low-cost process and no fake reward promise
- one festival_booking_card about honest Vishu/Eid/Onam/wedding-season appointment planning with limited slots and no fake urgency
- one local_discovery_card about helping nearby customers find the salon using Google Business, landmarks, and WhatsApp location pin


USER:
Generate 3 approved-style draft blocks for this business type.

Rules:
- Keep each block short and crystal clear.
- Include exact steps.
- Include copy-ready text where useful.
- Include a real example.
- Do not mix advice from another business type.
- Do not mention Cartroid unless this batch is specifically for custom gifts.
- Do not invent exact prices, percentages, or performance results.
- Use placeholders like {{businessName}}, {{location}}, {{startingPrice}}, or {{serviceName}} where needed.
- Make every card reusable for many businesses in the same category.
- Use lower_snake_case for domain, section_type, and every tag value.
- Keep copy_ready_text under 320 characters.
- If one card needs multiple reply templates, split them into separate cards.
- In example_for_business, describe how the business would use the card. Do not invent customer reactions, shares, saves, bookings, sales, or review results.
- Return JSONL only: one valid JSON object per line.
- Do not include markdown, comments, explanations, or production import SQL.

Every line must be one JSON object with exactly this action-card shape:

{
  "id": "",
  "title": "",
  "domain": "",
  "section_type": "",
  "business_type": "",
  "launch_status": "",
  "simple_explanation": "",
  "do_this": [],
  "copy_ready_text": "",
  "example_for_business": "",
  "why_this_works": "",
  "how_to_know_it_worked": "",
  "tags": {
    "category": [],
    "launch_status": [],
    "audience": [],
    "platform": [],
    "product_type": [],
    "goal": [],
    "location": [],
    "problem": []
  },
  "quality_score": 5,
  "language_level": "beginner"
}
