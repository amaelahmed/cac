import fs from "fs";
import path from "path";

const root = process.cwd();
const libraryDir = path.join(root, "data/strategy-library");
const blocksDir = path.join(libraryDir, "blocks/review-001");
const reportsDir = path.join(root, "reports");

const bannedWords = [
  "heuristic",
  "CAC",
  "CTA",
  "funnel",
  "persona",
  "objections",
  "trust builders",
  "messaging angles",
  "positioning",
  "proof assets",
  "leverage",
  "scalable",
  "conversion path",
  "low friction",
  "retention engine",
  "outcome first",
  "stakeholder",
  "acquisition strategy",
];

const scoringWeights = {
  quality_gate: { rule: "Only active blocks with quality_score 4 or 5 can be used", required: true },
  launch_status_match: 28,
  category_match: 24,
  customised_product_match: 24,
  product_type_match: 20,
  audience_match: 20,
  goal_match: 18,
  platform_match: 14,
  location_match: 14,
  problem_match: 14,
  business_model_match: 12,
  priority_urgent: 10,
  priority_important: 7,
  difficulty_easy: 8,
  difficulty_medium: 3,
  quality_score_5: 8,
  quality_score_4: 4,
  weak_or_generic_penalty: -40,
  repeated_topic_penalty: -30,
};

const cartroidProfile = {
  businessName: "Cartroid",
  location: "Kozhikode",
  category: "customised products",
  product: "customised gifts and trendy products",
  audience: "students and Gen-Z buyers",
  platform: "Instagram and WhatsApp",
  priceRange: "affordable student-friendly pricing",
  offer: "launch-week preview offer",
  deliveryArea: "Kozhikode and nearby college areas",
  tags: {
    category: ["retail", "customised_products", "gifts"],
    launch_status: ["pre_launch"],
    audience: ["students", "gen_z"],
    platform: ["instagram", "whatsapp", "google_business", "reels", "stories"],
    product_type: ["customised_product"],
    business_model: ["online_order", "delivery", "pickup", "local_store"],
    goal: ["first_10_customers", "first_30_customers", "launch_awareness", "build_trust", "explain_product", "sell_custom_products"],
    budget: ["no_budget", "low_budget"],
    location: ["india", "kerala", "kozhikode", "calicut", "local_city", "college_area"],
    problem: ["trust_issue", "price_confusion", "delivery_doubt", "unclear_order_process", "no_reviews", "no_content"],
  },
};

function content({
  title,
  whatItMeans,
  whatToDo,
  example,
  whyThisHelps,
  howToCheck,
  extra = {},
}) {
  return {
    title,
    what_it_means: whatItMeans,
    what_to_do: Array.isArray(whatToDo) ? whatToDo : [whatToDo],
    example,
    why_this_helps: whyThisHelps,
    how_to_check: howToCheck,
    ...extra,
  };
}

function block({
  id,
  title,
  domain,
  sectionType,
  category = [],
  launch = [],
  audience = [],
  platform = [],
  productType = [],
  model = [],
  goal = [],
  budget = [],
  location = [],
  problem = [],
  difficulty = "easy",
  priority = "important",
  timeframe = "this_week",
  quality = 5,
  body,
}) {
  return {
    id,
    title,
    domain,
    section_type: sectionType,
    content_json: body,
    category_tags: category,
    launch_status_tags: launch,
    audience_tags: audience,
    platform_tags: platform,
    product_type_tags: productType,
    business_model_tags: model,
    goal_tags: goal,
    budget_tags: budget,
    location_tags: location,
    problem_tags: problem,
    difficulty,
    priority,
    timeframe,
    quality_score: quality,
    language_level: "beginner",
    active: true,
    version: "review-001",
  };
}

const commonCartroidTags = {
  category: ["retail", "customised_products", "gifts"],
  launch: ["pre_launch"],
  audience: ["students", "gen_z"],
  productType: ["customised_product"],
  model: ["online_order", "delivery", "pickup", "local_store"],
  budget: ["no_budget", "low_budget"],
  location: ["india", "kerala", "kozhikode", "calicut", "local_city", "college_area"],
};

const blocks = [
  block({
    id: "sl-pre-launch-samples-001",
    title: "Make five sample products before asking for orders",
    domain: "pre_launch",
    sectionType: "first_priority",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp", "reels"],
    goal: ["launch_awareness", "first_10_customers", "build_trust"],
    problem: ["no_content", "trust_issue", "unclear_order_process"],
    priority: "urgent",
    timeframe: "today",
    body: content({
      title: "Make five sample products before asking for orders",
      whatItMeans: "People should see real examples before they trust a new business.",
      whatToDo: [
        "Create five sample products in different styles.",
        "Record close-up videos while making them.",
        "Use the samples in your first Instagram posts and WhatsApp status.",
      ],
      example: "{{businessName}} can make five sample {{product}} for birthdays, farewell gifts, best friends, couples, and college events in {{location}}.",
      whyThisHelps: "People understand what you sell faster when they see real products instead of plain posters.",
      howToCheck: "Check if people reply asking for price, preview, or delivery after seeing the samples.",
    }),
  }),
  block({
    id: "sl-pre-launch-top-actions-002",
    title: "Start with three actions, not a huge plan",
    domain: "pre_launch",
    sectionType: "simple_summary",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp"],
    goal: ["first_10_customers", "launch_awareness"],
    problem: ["no_content", "unclear_order_process"],
    priority: "urgent",
    timeframe: "today",
    body: content({
      title: "Start with three actions, not a huge plan",
      whatItMeans: "A new business needs a few clear first moves, not too many tasks.",
      whatToDo: [
        "Prepare sample products.",
        "Write the WhatsApp order steps.",
        "Post a simple launch teaser.",
      ],
      example: "{{businessName}} can say: We are opening soon in {{location}}. Send your idea on WhatsApp, see a preview, and confirm before we make it.",
      whyThisHelps: "Simple first actions help you move today instead of waiting for a perfect launch.",
      howToCheck: "Check if at least five people ask what you are launching or how to order.",
    }),
  }),
  block({
    id: "sl-pre-launch-seven-day-003",
    title: "Use a seven-day launch countdown",
    domain: "launch_week",
    sectionType: "seven_day_plan",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp", "stories", "reels"],
    goal: ["launch_awareness", "first_30_customers"],
    problem: ["not_enough_awareness", "no_content"],
    priority: "important",
    timeframe: "first_7_days",
    body: content({
      title: "Use a seven-day launch countdown",
      whatItMeans: "People remember a launch better when they see it many times in different ways.",
      whatToDo: [
        "Post one simple launch update every day for seven days.",
        "Show samples, price range, order steps, delivery area, and launch offer.",
        "Repeat the same update on WhatsApp status.",
      ],
      example: "{{businessName}} can run a seven-day countdown for {{audience}} in {{location}} with one product video each day.",
      whyThisHelps: "A countdown gives people time to notice, ask questions, and share it with friends.",
      howToCheck: "Check story views, replies, saves, and WhatsApp messages during the seven days.",
    }),
  }),
  block({
    id: "sl-pre-launch-preorder-004",
    title: "Collect interested people before opening",
    domain: "first_customers",
    sectionType: "first_priority",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp"],
    goal: ["first_10_customers", "first_30_customers"],
    problem: ["not_enough_awareness", "trust_issue"],
    priority: "important",
    timeframe: "this_week",
    body: content({
      title: "Collect interested people before opening",
      whatItMeans: "You do not need full orders before launch. You need a list of people who want to see the first products.",
      whatToDo: [
        "Ask people to message the word preview.",
        "Save their names in a simple list.",
        "Send them first access when samples are ready.",
      ],
      example: "{{businessName}} can post: Message preview if you want to see the first custom gift samples before launch.",
      whyThisHelps: "A small list gives you warm people to contact on launch day.",
      howToCheck: "Check how many people message preview and what product they ask about.",
    }),
  }),
  block({
    id: "sl-pre-launch-google-005",
    title: "Set up Google Business before launch day",
    domain: "google_business",
    sectionType: "google_business_action",
    ...commonCartroidTags,
    platform: ["google_business"],
    goal: ["launch_awareness", "build_trust"],
    problem: ["no_google_presence", "trust_issue"],
    priority: "important",
    timeframe: "this_week",
    body: content({
      title: "Set up Google Business before launch day",
      whatItMeans: "Local buyers trust a business more when they can find it on Google.",
      whatToDo: [
        "Add business name, category, location, hours, and contact method.",
        "Upload sample product photos.",
        "Add a post saying launch orders are opening soon.",
      ],
      example: "{{businessName}} can add photos of sample {{product}} and mention delivery or pickup in {{deliveryArea}}.",
      whyThisHelps: "People in {{location}} can check if the business looks real before messaging.",
      howToCheck: "Check profile views, direction clicks, calls, and WhatsApp clicks.",
    }),
  }),
  block({
    id: "sl-pre-launch-offer-006",
    title: "Use a simple launch offer",
    domain: "offers",
    sectionType: "offer_idea",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp"],
    goal: ["first_10_customers", "more_orders"],
    problem: ["price_confusion", "not_enough_awareness"],
    priority: "important",
    timeframe: "launch_week",
    body: content({
      title: "Use a simple launch offer",
      whatItMeans: "A launch offer should be easy to understand and easy to explain.",
      whatToDo: [
        "Give the first few buyers a small gift-packing add-on.",
        "Avoid confusing discounts.",
        "Make the offer clear in one line.",
      ],
      example: "{{businessName}} can say: First 20 launch orders get free gift packing in {{location}}.",
      whyThisHelps: "A clear offer gives people a reason to order early without making the brand look cheap.",
      howToCheck: "Check how many people mention the launch offer while messaging.",
    }),
  }),
  block({
    id: "sl-custom-preview-001",
    title: "Send a design preview before making the product",
    domain: "customised_products",
    sectionType: "confidence_step",
    ...commonCartroidTags,
    platform: ["whatsapp", "instagram"],
    goal: ["build_trust", "sell_custom_products"],
    problem: ["trust_issue", "quality_doubt", "unclear_order_process"],
    priority: "urgent",
    timeframe: "today",
    body: content({
      title: "Send a design preview before making the product",
      whatItMeans: "Customers should see the look before you start making the order.",
      whatToDo: [
        "Ask for name, photo, colour, size, and spelling.",
        "Send a simple preview image or mockup.",
        "Start making only after the customer confirms.",
      ],
      example: "{{businessName}} can reply: I will send a preview first. Please check name, photo, colour, size, and spelling before I make it.",
      whyThisHelps: "This prevents mistakes and makes customers feel safe before paying.",
      howToCheck: "Check if fewer people ask what happens if the design is wrong.",
    }),
  }),
  block({
    id: "sl-custom-safe-order-002",
    title: "Use a safe six-step custom order process",
    domain: "customised_products",
    sectionType: "first_priority",
    ...commonCartroidTags,
    platform: ["whatsapp", "instagram"],
    goal: ["sell_custom_products", "build_trust"],
    problem: ["unclear_order_process", "delivery_doubt", "trust_issue"],
    priority: "urgent",
    timeframe: "today",
    body: content({
      title: "Use a safe six-step custom order process",
      whatItMeans: "Custom orders need a clear process because small mistakes can create big problems.",
      whatToDo: [
        "Customer sends name, photo, design idea, and delivery date.",
        "Shop sends preview.",
        "Customer confirms details.",
        "Customer pays advance.",
        "Product is made.",
        "Final photo is sent before delivery.",
      ],
      example: "{{businessName}} can pin this process in Instagram highlights and send it as the first WhatsApp reply.",
      whyThisHelps: "Customers trust the order more when every step is clear.",
      howToCheck: "Check if customers send complete details faster after reading the process.",
    }),
  }),
  block({
    id: "sl-custom-advance-payment-003",
    title: "Explain advance payment in a calm way",
    domain: "customised_products",
    sectionType: "customer_question",
    ...commonCartroidTags,
    platform: ["whatsapp"],
    goal: ["build_trust", "sell_custom_products"],
    problem: ["price_confusion", "trust_issue"],
    priority: "important",
    timeframe: "today",
    body: content({
      title: "Explain advance payment in a calm way",
      whatItMeans: "Customers should understand why advance payment is needed for custom work.",
      whatToDo: [
        "Ask for advance only after preview and timing are confirmed.",
        "Explain that custom material and making time are reserved.",
        "Send a simple payment confirmation message.",
      ],
      example: "{{businessName}} can say: Once you confirm the preview, we take advance so we can reserve material and start your custom order.",
      whyThisHelps: "Clear payment rules reduce doubt and awkward price conversations.",
      howToCheck: "Check if fewer customers stop replying when advance payment is mentioned.",
    }),
  }),
  block({
    id: "sl-custom-final-photo-004",
    title: "Send a final photo before delivery",
    domain: "customised_products",
    sectionType: "confidence_step",
    ...commonCartroidTags,
    platform: ["whatsapp"],
    goal: ["build_trust", "sell_custom_products"],
    problem: ["delivery_doubt", "quality_doubt"],
    priority: "important",
    timeframe: "this_week",
    body: content({
      title: "Send a final photo before delivery",
      whatItMeans: "Customers feel safer when they see the finished product before it reaches them.",
      whatToDo: [
        "Take one clear final photo.",
        "Send it before delivery or pickup.",
        "Ask the customer to confirm the details once more.",
      ],
      example: "{{businessName}} can send: Your order is ready. Please check the final photo before delivery in {{deliveryArea}}.",
      whyThisHelps: "It reduces delivery-time worry and shows that the shop checks details.",
      howToCheck: "Check if customers reply faster and share happier feedback after delivery.",
    }),
  }),
  block({
    id: "sl-custom-material-005",
    title: "Show the material before people ask",
    domain: "customised_products",
    sectionType: "confidence_step",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp", "reels"],
    goal: ["build_trust", "explain_product"],
    problem: ["quality_doubt", "trust_issue"],
    priority: "important",
    timeframe: "this_week",
    body: content({
      title: "Show the material before people ask",
      whatItMeans: "People want to know if the product will look and feel good in real life.",
      whatToDo: [
        "Record close-up videos of the material.",
        "Show thickness, finish, size, and packaging.",
        "Mention care instructions if needed.",
      ],
      example: "{{businessName}} can post a Reel showing the material of a custom gift before the design is added.",
      whyThisHelps: "Material clarity reduces quality doubt and makes price easier to accept.",
      howToCheck: "Check if people ask fewer basic quality questions in messages.",
    }),
  }),
  block({
    id: "sl-whatsapp-first-reply-001",
    title: "Use a first reply that collects the right details",
    domain: "whatsapp",
    sectionType: "whatsapp_message",
    ...commonCartroidTags,
    platform: ["whatsapp"],
    goal: ["first_10_customers", "sell_custom_products"],
    problem: ["unclear_order_process"],
    priority: "urgent",
    timeframe: "today",
    body: content({
      title: "Use a first reply that collects the right details",
      whatItMeans: "The first reply should make ordering easy without a long conversation.",
      whatToDo: [
        "Ask for product type, name/photo/design, date needed, and delivery area.",
        "Keep the reply friendly and short.",
        "Save it as a WhatsApp quick reply.",
      ],
      example: "Hi, thanks for messaging {{businessName}}. Please send the product idea, name/photo/design, date needed, and area in {{location}}. I will reply with price and preview steps.",
      whyThisHelps: "You get useful details early, and customers feel guided.",
      howToCheck: "Check if more customers send complete order details in the first message.",
    }),
  }),
  block({
    id: "sl-whatsapp-price-reply-002",
    title: "Give price without sounding unsure",
    domain: "whatsapp",
    sectionType: "whatsapp_message",
    ...commonCartroidTags,
    platform: ["whatsapp"],
    goal: ["sell_custom_products", "build_trust"],
    problem: ["price_confusion"],
    priority: "important",
    timeframe: "today",
    body: content({
      title: "Give price without sounding unsure",
      whatItMeans: "Customers should know what affects the price.",
      whatToDo: [
        "Share a starting price or price range.",
        "Mention what can change the price.",
        "Confirm final price after preview details.",
      ],
      example: "{{businessName}} can say: Prices start from {{priceRange}}. Final price depends on product size, design detail, and delivery area.",
      whyThisHelps: "Price clarity brings serious buyers and reduces back-and-forth.",
      howToCheck: "Check if more people continue the chat after receiving price.",
    }),
  }),
  block({
    id: "sl-whatsapp-preview-confirm-003",
    title: "Ask for preview confirmation in one clean message",
    domain: "whatsapp",
    sectionType: "whatsapp_message",
    ...commonCartroidTags,
    platform: ["whatsapp"],
    goal: ["build_trust", "sell_custom_products"],
    problem: ["quality_doubt", "unclear_order_process"],
    priority: "urgent",
    timeframe: "today",
    body: content({
      title: "Ask for preview confirmation in one clean message",
      whatItMeans: "The customer must confirm small details before the order starts.",
      whatToDo: [
        "Send the preview.",
        "Ask them to check spelling, photo, colour, size, and date.",
        "Start only after they reply confirmed.",
      ],
      example: "{{businessName}} can send: Please check the preview carefully. Confirm name spelling, photo, colour, size, and delivery date in {{location}}. I will start making it after you reply confirmed.",
      whyThisHelps: "It protects both the customer and the shop from avoidable mistakes.",
      howToCheck: "Check if confirmed previews reduce correction requests later.",
    }),
  }),
  block({
    id: "sl-instagram-bio-001",
    title: "Write an Instagram bio that explains ordering",
    domain: "instagram",
    sectionType: "instagram_action",
    ...commonCartroidTags,
    platform: ["instagram"],
    goal: ["launch_awareness", "first_10_customers", "explain_product"],
    problem: ["unclear_order_process", "no_content"],
    priority: "urgent",
    timeframe: "today",
    body: content({
      title: "Write an Instagram bio that explains ordering",
      whatItMeans: "A new visitor should understand what you sell and how to order in five seconds.",
      whatToDo: [
        "Say what you sell.",
        "Mention preview before making.",
        "Mention WhatsApp ordering and local delivery.",
      ],
      example: "Customised gifts in {{location}}. Send your idea on WhatsApp. Preview before making. Delivery and pickup available.",
      whyThisHelps: "A clear bio turns profile visits into messages.",
      howToCheck: "Check if profile visitors start messaging instead of only viewing posts.",
    }),
  }),
  block({
    id: "sl-instagram-highlights-002",
    title: "Create four Instagram highlights before launch",
    domain: "instagram",
    sectionType: "instagram_action",
    ...commonCartroidTags,
    platform: ["instagram", "stories"],
    goal: ["build_trust", "explain_product"],
    problem: ["unclear_order_process", "trust_issue"],
    priority: "important",
    timeframe: "next_2_days",
    body: content({
      title: "Create four Instagram highlights before launch",
      whatItMeans: "Highlights help new visitors find basic answers without asking.",
      whatToDo: [
        "Create highlights named Samples, How to Order, Price, and Delivery.",
        "Add one simple story to each highlight.",
        "Update them as questions come in.",
      ],
      example: "{{businessName}} can keep How to Order as four story slides: send idea, get preview, confirm, receive in {{location}}.",
      whyThisHelps: "People trust businesses that answer basic questions clearly.",
      howToCheck: "Check if fewer people ask the same basic questions in DMs.",
    }),
  }),
  block({
    id: "sl-instagram-reel-making-003",
    title: "Record making videos, not only final photos",
    domain: "instagram",
    sectionType: "instagram_action",
    ...commonCartroidTags,
    platform: ["instagram", "reels"],
    goal: ["build_trust", "sell_custom_products"],
    problem: ["trust_issue", "quality_doubt", "no_content"],
    priority: "important",
    timeframe: "this_week",
    body: content({
      title: "Record making videos, not only final photos",
      whatItMeans: "People trust custom products more when they see the work happening.",
      whatToDo: [
        "Record the product before customisation.",
        "Record the making step.",
        "Show the final packed product.",
      ],
      example: "{{businessName}} can post a Reel showing a name/photo idea becoming a finished gift for a student in {{location}}.",
      whyThisHelps: "Making videos prove that the product is real and handmade with care.",
      howToCheck: "Check watch time, saves, shares, and messages after each Reel.",
    }),
  }),
  block({
    id: "sl-local-college-001",
    title: "Start with college gift moments",
    domain: "local_marketing",
    sectionType: "local_action",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp", "local_groups"],
    goal: ["first_30_customers", "launch_awareness"],
    problem: ["not_enough_awareness"],
    priority: "important",
    timeframe: "this_week",
    body: content({
      title: "Start with college gift moments",
      whatItMeans: "Students buy gifts for birthdays, farewells, friends, couples, and small celebrations.",
      whatToDo: [
        "Create posts for each college gift moment.",
        "Ask friends to share in student groups.",
        "Offer pickup or local delivery near college areas.",
      ],
      example: "{{businessName}} can post: Farewell gift for your best friend in {{location}}? Send the name/photo and we will show a preview.",
      whyThisHelps: "Specific student moments are easier to remember than a general gift post.",
      howToCheck: "Check which occasion gets the most replies and saves.",
    }),
  }),
  block({
    id: "sl-local-malayalam-002",
    title: "Use simple Malayalam-English when it fits",
    domain: "local_marketing",
    sectionType: "caption",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp", "stories"],
    goal: ["launch_awareness", "first_10_customers"],
    problem: ["not_enough_awareness"],
    priority: "optional",
    timeframe: "this_week",
    body: content({
      title: "Use simple Malayalam-English when it fits",
      whatItMeans: "Local words can make the brand feel closer to students in Kerala.",
      whatToDo: [
        "Use simple mixed-language captions only when it sounds natural.",
        "Keep the order details in clear English.",
        "Test one local-style caption each week.",
      ],
      example: "{{businessName}} can say: Gift venam, but basic aakaruthu. Send your idea. We will show a preview before making.",
      whyThisHelps: "The post feels more local and less like a generic brand page.",
      howToCheck: "Check if local-style captions get more replies or shares from students.",
    }),
  }),
  block({
    id: "sl-question-design-wrong-001",
    title: "Answer what happens if the design is wrong",
    domain: "trust_building",
    sectionType: "customer_question",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp"],
    goal: ["build_trust", "sell_custom_products"],
    problem: ["quality_doubt", "trust_issue"],
    priority: "important",
    timeframe: "this_week",
    body: content({
      title: "Answer what happens if the design is wrong",
      whatItMeans: "Custom product buyers need to know how mistakes are handled.",
      whatToDo: [
        "Explain the preview confirmation process.",
        "Explain what the shop will fix if the mistake is from the shop side.",
        "Keep the wording calm and clear.",
      ],
      example: "{{businessName}} can say: We make only after preview confirmation. If our side makes a mistake after that, we will fix it clearly.",
      whyThisHelps: "A clear mistake policy makes customers less afraid to order.",
      howToCheck: "Check if people ask fewer fear-based questions before paying.",
    }),
  }),
  block({
    id: "sl-measurement-first-signals-001",
    title: "Track first signals, not big sales numbers",
    domain: "measurement",
    sectionType: "measurement",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp"],
    goal: ["first_10_customers", "launch_awareness"],
    problem: ["not_enough_awareness", "price_confusion"],
    priority: "important",
    timeframe: "first_7_days",
    body: content({
      title: "Track first signals, not big sales numbers",
      whatItMeans: "Before launch, small signals show whether people understand and care.",
      whatToDo: [
        "Count profile visits, story replies, price questions, and preview requests.",
        "Write repeated questions in a note.",
        "Use those questions for the next posts.",
      ],
      example: "{{businessName}} can track how many students message preview, price, delivery, or how to order in {{location}}.",
      whyThisHelps: "Early signals tell you what to explain before spending money.",
      howToCheck: "Check if the number of useful messages increases each week.",
    }),
  }),
];

const calendarIdeas = [
  ["cal-launch-teaser-001", "Reel", "First look at {{businessName}}", "Show 3 sample customised products placed on a table with close-up shots.", "{{location}}, something unique is coming. Customised products made easy. Send your idea, see a preview, and confirm before we make it.", "People see what you sell before launch.", "Follow and message preview on WhatsApp."],
  ["cal-design-poll-002", "Story poll", "Let students choose the first design", "Show two design options with a poll sticker.", "Which design should {{businessName}} launch first?", "People feel involved before launch.", "Vote on the poll."],
  ["cal-how-to-order-003", "Carousel", "How to order", "Create 4 slides: send idea, see preview, confirm, receive delivery.", "Ordering from {{businessName}} is simple: send idea, see preview, confirm, get it delivered in {{location}}.", "It removes confusion before the first order.", "Save the post or message on WhatsApp."],
  ["cal-sample-reveal-004", "Reel", "Sample product reveal", "Reveal one sample product from plain material to final custom look.", "One idea can become a gift when the details are handled properly.", "A real sample makes the product easy to understand.", "Message your idea for a preview."],
  ["cal-founder-intro-005", "Photo post", "Why {{businessName}} is starting", "Show the founder workspace, sample products, or packing table.", "We are starting {{businessName}} because gifts should feel personal without being hard to order.", "People trust a new shop more when they see the person behind it.", "Comment one gift idea you want to see."],
  ["cal-whatsapp-walkthrough-006", "Screen recording", "WhatsApp ordering walkthrough", "Record a sample chat with private details hidden.", "This is how ordering works on WhatsApp: idea, preview, confirmation, making, delivery.", "It shows that ordering is simple and safe.", "Send a WhatsApp message with your idea."],
  ["cal-making-video-007", "Reel", "Making video", "Film hands making or finishing one custom product.", "Watch a simple idea become a finished gift.", "Making videos make the shop feel real.", "Ask how many days your idea will take."],
  ["cal-before-after-008", "Carousel", "Before and after customisation", "Show the idea/reference on slide 1 and final product on slide 2.", "Before: a simple idea. After: a personal gift ready for someone special.", "Before/after content proves what customisation does.", "Send your reference photo."],
  ["cal-delivery-time-009", "Story", "How many days it takes", "Show a simple timing chart for normal and urgent orders.", "Need a gift by a date? Tell us early so we can confirm the making time.", "Timing clarity reduces last-minute doubt.", "Reply with the date you need it."],
  ["cal-price-clarity-010", "Carousel", "Starting price clarity", "Show 3 product types with starting price ranges.", "No guessing. Here is how price changes by size, detail, and delivery.", "Clear price brings serious buyers.", "Message the product type you want."],
  ["cal-birthday-gift-011", "Reel", "Birthday gift idea", "Show a sample gift with name/photo/detail and simple packaging.", "For the friend who says they do not want gifts but still keeps personal ones.", "Occasions give people a reason to order.", "Tag the friend who needs this."],
  ["cal-student-reel-012", "Reel", "Gift idea for college friends", "Shoot products near notebooks, tote bag, ID card, or campus-style props.", "College gifts do not need to be boring. Make it personal.", "Students can imagine when they would use it.", "Share with your group."],
  ["cal-kozhikode-delivery-013", "Post", "{{location}} delivery and pickup", "Show a simple local delivery/pickup graphic.", "{{businessName}} will support delivery and pickup around {{deliveryArea}}.", "Local clarity makes ordering feel easier.", "Ask if your area is covered."],
  ["cal-launch-offer-014", "Post", "Launch-week offer", "Show the small launch add-on clearly.", "Launch week: first 20 orders get free gift packing.", "A simple offer gives people a reason to order early.", "Message launch to reserve a slot."],
  ["cal-first-ten-015", "Story", "First 10 test orders", "Show a numbered slot card from 1 to 10.", "We are taking the first 10 test orders slowly so every detail is checked.", "Limited early slots create focus without overpromising.", "Reply slot if you want one."],
  ["cal-packaging-016", "Reel", "Packaging video", "Record packing one sample product from final photo to finished pack.", "The gift should look good when it reaches their hand.", "Packaging videos make gifting feel complete.", "Ask for gift packing."],
  ["cal-faq-017", "Carousel", "Questions before ordering", "Answer price, preview, advance, delivery, and timing.", "Before you order, here are the five things most people ask.", "Answers reduce repeated messages.", "Send the question we missed."],
  ["cal-referral-018", "Story", "Friend referral", "Show two products together with a simple friend offer.", "Ordering with a friend? Both of you can get a small launch add-on.", "Student buyers often share gift ideas with friends.", "Share this with one friend."],
  ["cal-review-after-orders-019", "Post", "How early feedback will work", "Show a simple feedback request template.", "After first orders, tell us what looked good and what should improve.", "This sets the review habit without pretending you already have customers.", "Become an early customer."],
  ["cal-design-week-020", "Carousel", "Design of the week", "Show one design style and who it suits.", "Design of the week: simple, personal, and easy to gift.", "A weekly design gives people a reason to return.", "Vote for next week's design."],
  ["cal-material-021", "Reel", "Material close-up", "Show material texture, size, finish, and final look.", "Here is what goes into the product before it becomes a gift.", "Material clarity reduces quality doubt.", "Ask which material fits your idea."],
  ["cal-mistake-process-022", "Carousel", "How we prevent mistakes", "Show spelling check, photo check, colour check, size check, date check.", "Custom orders need careful checking. Here is how we prevent mistakes.", "It makes people feel safe before paying.", "Save this before ordering."],
  ["cal-preview-confirm-023", "Story", "Preview confirmation", "Show a sample preview and confirmation reply.", "We make only after you confirm the preview.", "This answers a major custom-product fear.", "Reply preview to see how it works."],
  ["cal-farewell-024", "Reel", "Farewell gift idea", "Show a product with a farewell message or batch memory.", "For the classmate who made college better.", "Farewell moments fit student buyers strongly.", "Message the date you need it."],
  ["cal-local-language-025", "Post", "Malayalam-English local caption", "Show one product with a simple local-style caption.", "Gift venam, but basic aakaruthu. Send your idea and see a preview first.", "Local language can make the page feel closer.", "Send this to a friend."],
  ["cal-google-profile-026", "Post", "Find us on Google soon", "Show a screenshot-style post of Google Business setup.", "{{businessName}} is getting ready on Google so local buyers can find photos, hours, and contact details.", "Google presence makes the business look real.", "Search and save the profile when live."],
  ["cal-area-check-027", "Story", "Delivery area check", "Ask followers to reply with their area or college.", "Which area should we cover first in {{location}}?", "It helps you learn where interested buyers are.", "Reply with your area."],
  ["cal-order-checklist-028", "Carousel", "Custom order checklist", "List name, photo, size, colour, date, area, and budget.", "Send these details and we can guide your order faster.", "Complete details make WhatsApp ordering smoother.", "Save before messaging."],
  ["cal-countdown-029", "Reel", "Three-day launch countdown", "Show three fast clips: sample, packing, WhatsApp order.", "3 days to opening test orders. Samples, preview, and WhatsApp ordering are almost ready.", "Short countdown posts build memory.", "Follow for opening day."],
  ["cal-opening-day-030", "Reel", "Opening day", "Show the best sample, ordering steps, and launch offer in one Reel.", "{{businessName}} is open for test orders in {{location}}. Send your idea, see preview, confirm, and we will make it.", "A clear opening post turns attention into messages.", "Message preview on WhatsApp."],
];

for (const [id, postType, topic, whatToShow, caption, why, action] of calendarIdeas) {
  const readyCaption = /\{\{businessName\}\}|\{\{location\}\}/.test(caption)
    ? caption
    : "{{businessName}} in {{location}}: " + caption;

  blocks.push(block({
    id,
    title: topic.replace(/\{\{businessName\}\}/g, "Business"),
    domain: "content_calendar",
    sectionType: "thirty_day_calendar",
    ...commonCartroidTags,
    platform: ["instagram", "whatsapp", postType.toLowerCase().includes("story") ? "stories" : "reels"],
    goal: ["launch_awareness", "first_10_customers", "first_30_customers", "build_trust"],
    problem: ["not_enough_awareness", "trust_issue", "unclear_order_process", "no_content"],
    priority: Number(id.match(/-(\d+)$/)?.[1] || 1) <= 7 ? "urgent" : "important",
    timeframe: "first_30_days",
    body: content({
      title: topic,
      whatItMeans: "This is one specific post for the launch calendar.",
      whatToDo: [whatToShow],
      example: readyCaption,
      whyThisHelps: why,
      howToCheck: "Check replies, saves, shares, and WhatsApp messages from this post.",
      extra: {
        day_hint: Number(id.match(/-(\d+)$/)?.[1] || 1),
        post_type: postType,
        topic,
        what_to_show: whatToShow,
        ready_caption: readyCaption,
        customer_action: action,
      },
    }),
  }));
}

function stringifyContent(block) {
  return JSON.stringify({ title: block.title, content_json: block.content_json });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesBannedWord(text) {
  const lower = text.toLowerCase();
  return bannedWords.filter(word => {
    const pattern = new RegExp(`\\b${escapeRegex(word.toLowerCase()).replace(/\\s+/g, "\\s+")}\\b`);
    return pattern.test(lower);
  });
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const value = getter(item);
    if (Array.isArray(value)) {
      for (const entry of value) acc[entry] = (acc[entry] || 0) + 1;
    } else {
      acc[value] = (acc[value] || 0) + 1;
    }
    return acc;
  }, {});
}

function validateBlock(block) {
  const problems = [];
  const required = [
    "id", "title", "domain", "section_type", "content_json", "category_tags",
    "launch_status_tags", "audience_tags", "platform_tags", "product_type_tags",
    "business_model_tags", "goal_tags", "budget_tags", "location_tags",
    "problem_tags", "difficulty", "priority", "timeframe", "quality_score",
  ];

  for (const key of required) {
    if (block[key] === undefined || block[key] === null || block[key] === "") problems.push(`missing ${key}`);
  }

  const contentRequired = ["title", "what_it_means", "what_to_do", "example", "why_this_helps", "how_to_check"];
  for (const key of contentRequired) {
    if (!block.content_json?.[key] || (Array.isArray(block.content_json[key]) && block.content_json[key].length === 0)) {
      problems.push(`missing content_json.${key}`);
    }
  }

  if (block.active && Number(block.quality_score) < 4) problems.push("active block quality_score must be 4 or 5");

  const banned = includesBannedWord(stringifyContent(block));
  if (banned.length) problems.push(`banned words: ${banned.join(", ")}`);

  const contentText = stringifyContent(block).toLowerCase();
  if (!contentText.includes("{{businessname}}") && !contentText.includes("{{location}}")) {
    problems.push("content should include business or location placeholder");
  }

  if (contentText.length < 260) problems.push("content is too thin");

  return problems;
}

function hydrate(text, profile = cartroidProfile) {
  return String(text)
    .replace(/\{\{businessName\}\}/g, profile.businessName)
    .replace(/\{\{location\}\}/g, profile.location)
    .replace(/\{\{category\}\}/g, profile.category)
    .replace(/\{\{product\}\}/g, profile.product)
    .replace(/\{\{audience\}\}/g, profile.audience)
    .replace(/\{\{platform\}\}/g, profile.platform)
    .replace(/\{\{priceRange\}\}/g, profile.priceRange)
    .replace(/\{\{offer\}\}/g, profile.offer)
    .replace(/\{\{deliveryArea\}\}/g, profile.deliveryArea);
}

function tagOverlap(blockValues, profileValues) {
  const blockSet = new Set(blockValues || []);
  return (profileValues || []).filter(value => blockSet.has(value));
}

function scoreBlock(block, profile = cartroidProfile) {
  if (!block.active || block.quality_score < 4) return -9999;

  let score = 0;
  const matched = [];
  const addScore = (name, values, weight) => {
    const overlap = tagOverlap(values, profile.tags[name] || []);
    if (overlap.length) {
      score += weight + Math.min(8, overlap.length * 2);
      matched.push(...overlap);
    }
  };

  addScore("launch_status", block.launch_status_tags, scoringWeights.launch_status_match);
  addScore("category", block.category_tags, scoringWeights.category_match);
  addScore("product_type", block.product_type_tags, scoringWeights.product_type_match);
  if ((block.product_type_tags || []).includes("customised_product")) score += scoringWeights.customised_product_match;
  addScore("audience", block.audience_tags, scoringWeights.audience_match);
  addScore("goal", block.goal_tags, scoringWeights.goal_match);
  addScore("platform", block.platform_tags, scoringWeights.platform_match);
  addScore("location", block.location_tags, scoringWeights.location_match);
  addScore("problem", block.problem_tags, scoringWeights.problem_match);
  addScore("business_model", block.business_model_tags, scoringWeights.business_model_match);
  score += block.priority === "urgent" ? scoringWeights.priority_urgent : block.priority === "important" ? scoringWeights.priority_important : 0;
  score += block.difficulty === "easy" ? scoringWeights.difficulty_easy : block.difficulty === "medium" ? scoringWeights.difficulty_medium : 0;
  score += block.quality_score === 5 ? scoringWeights.quality_score_5 : scoringWeights.quality_score_4;

  return { score, matched: Array.from(new Set(matched)) };
}

function explainSelection(block) {
  const result = scoreBlock(block);
  const useful = result.matched
    .filter(tag => !["india", "retail", "gifts"].includes(tag))
    .slice(0, 5)
    .map(tag => tag.replace(/_/g, " "));
  return `Suggested because your business matches ${useful.join(", ")}.`;
}

function renderBlock(block) {
  const item = block.content_json;
  return [
    `### ${hydrate(item.title)}`,
    "",
    `**Why we suggest this:** ${explainSelection(block)}`,
    "",
    `**What to do:** ${item.what_to_do.map(step => hydrate(step)).join(" ")}`,
    "",
    `**Why it matters:** ${hydrate(item.why_this_helps)}`,
    "",
    `**Example for this business:** ${hydrate(item.example)}`,
    "",
    `**How to know if it worked:** ${hydrate(item.how_to_check)}`,
  ].join("\n");
}

function renderCalendarDay(block, index) {
  const item = block.content_json;
  return [
    `### Day ${index + 1}: ${hydrate(item.topic)}`,
    "",
    `- **Post type:** ${item.post_type}`,
    `- **What to show:** ${hydrate(item.what_to_show)}`,
    `- **Ready caption:** ${hydrate(item.ready_caption)}`,
    `- **Why this helps:** ${hydrate(item.why_this_helps)}`,
    `- **Customer action:** ${hydrate(item.customer_action)}`,
    `- **Why we suggest this:** ${explainSelection(block)}`,
  ].join("\n");
}

const idCounts = countBy(blocks, block => block.id);
const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1).map(([id]) => id);
const validation = blocks.map(item => ({ id: item.id, problems: validateBlock(item) })).filter(item => item.problems.length);
const calendarTopics = blocks
  .filter(item => item.section_type === "thirty_day_calendar")
  .map(item => hydrate(item.content_json.topic).toLowerCase());
const duplicateCalendarTopics = Object.entries(countBy(calendarTopics, topic => topic))
  .filter(([, count]) => count > 1)
  .map(([topic]) => topic);
const bannedViolations = blocks
  .map(item => ({ id: item.id, words: includesBannedWord(stringifyContent(item)) }))
  .filter(item => item.words.length);
const weakBlockWarnings = validation.filter(item => item.problems.some(problem =>
  problem.includes("quality_score")
  || problem.includes("too thin")
  || problem.includes("missing content_json")
  || problem.includes("content should include")
));

const activeBlocks = blocks.filter(item => item.active && item.quality_score >= 4);
const topActionBlocks = activeBlocks
  .filter(item => item.section_type !== "thirty_day_calendar")
  .map(item => ({ item, ...scoreBlock(item) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 6)
  .map(entry => entry.item);
const calendarBlocks = activeBlocks
  .filter(item => item.section_type === "thirty_day_calendar")
  .map(item => ({ item, ...scoreBlock(item) }))
  .sort((a, b) => {
    const dayA = a.item.content_json.day_hint || 999;
    const dayB = b.item.content_json.day_hint || 999;
    return dayA - dayB || b.score - a.score;
  })
  .slice(0, 30)
  .map(entry => entry.item);
const randomSampleBlocks = activeBlocks
  .slice()
  .sort((a, b) => {
    const seed = value => Array.from(value).reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
    return seed(a.id) - seed(b.id);
  })
  .slice(0, 8);

const report = [
  "# Strategy Library Review Batch 001",
  "",
  "This is a review batch only. It has not been imported into D1.",
  "Batch scope: Cartroid-type businesses first: pre-launch, customised products, retail/product store, Instagram, WhatsApp, Google Business/local search, students/Gen-Z, Kozhikode/Calicut/local context, first enquiries, and first customer actions.",
  "",
  "## Counts",
  "",
  `- Total blocks: ${blocks.length}`,
  `- Active quality blocks: ${activeBlocks.length}`,
  `- Draft/rejected blocks: ${blocks.length - activeBlocks.length}`,
  `- Calendar blocks: ${calendarBlocks.length}`,
  "",
  "## Retrieval Scoring Weights",
  "",
  "```json",
  JSON.stringify(scoringWeights, null, 2),
  "```",
  "",
  "## Quality Gates",
  "",
  `- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}`,
  `- Duplicate calendar topics: ${duplicateCalendarTopics.length ? duplicateCalendarTopics.join(", ") : "none"}`,
  `- Banned word violations: ${bannedViolations.length}`,
  ...bannedViolations.slice(0, 25).map(item => `  - ${item.id}: ${item.words.join(", ")}`),
  `- Weak block warnings: ${weakBlockWarnings.length}`,
  ...weakBlockWarnings.slice(0, 25).map(item => `  - ${item.id}: ${item.problems.join("; ")}`),
  `- Blocks with validation problems: ${validation.length}`,
  ...validation.slice(0, 25).map(item => `  - ${item.id}: ${item.problems.join("; ")}`),
  "",
  "## Count By Domain",
  "",
  "```json",
  JSON.stringify(countBy(activeBlocks, item => item.domain), null, 2),
  "```",
  "",
  "## Count By Section Type",
  "",
  "```json",
  JSON.stringify(countBy(activeBlocks, item => item.section_type), null, 2),
  "```",
  "",
  "## Count By Category Tag",
  "",
  "```json",
  JSON.stringify(countBy(activeBlocks, item => item.category_tags), null, 2),
  "```",
  "",
  "## Count By Launch Status",
  "",
  "```json",
  JSON.stringify(countBy(activeBlocks, item => item.launch_status_tags), null, 2),
  "```",
  "",
  "## Count By Platform",
  "",
  "```json",
  JSON.stringify(countBy(activeBlocks, item => item.platform_tags), null, 2),
  "```",
  "",
  "## Random Sample Blocks",
  "",
  ...randomSampleBlocks.map(item => [
    `### ${item.id}`,
    "",
    `- **Domain:** ${item.domain}`,
    `- **Section:** ${item.section_type}`,
    `- **Title:** ${hydrate(item.content_json.title)}`,
    `- **Example:** ${hydrate(item.content_json.example)}`,
    `- **Why this helps:** ${hydrate(item.content_json.why_this_helps)}`,
  ].join("\n")),
  "",
  "# Rendered Cartroid Sample",
  "",
  "## Do This First",
  "",
  ...topActionBlocks.slice(0, 3).map((item, index) => `${index + 1}. ${hydrate(item.content_json.title)}\n   - ${explainSelection(item)}`),
  "",
  "## Today's Action",
  "",
  renderBlock(topActionBlocks[0]),
  "",
  "## Sample Strategy Blocks",
  "",
  ...topActionBlocks.slice(1, 6).map(renderBlock),
  "",
  "## 30-Day Calendar Preview",
  "",
  ...calendarBlocks.map(renderCalendarDay),
  "",
].join("\n");

fs.mkdirSync(libraryDir, { recursive: true });
fs.mkdirSync(blocksDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(libraryDir, "review-batch-001.jsonl"), `${blocks.map(item => JSON.stringify(item)).join("\n")}\n`);
fs.writeFileSync(path.join(libraryDir, "scoring-weights.json"), `${JSON.stringify(scoringWeights, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "strategy_library_review_batch_001.md"), report);

const blocksByDomain = blocks.reduce((acc, item) => {
  const key = item.domain.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
  acc[key] = acc[key] || [];
  acc[key].push(item);
  return acc;
}, {});

for (const [domain, domainBlocks] of Object.entries(blocksByDomain)) {
  fs.writeFileSync(path.join(blocksDir, `${domain}.jsonl`), `${domainBlocks.map(item => JSON.stringify(item)).join("\n")}\n`);
}

if (validation.length || duplicateIds.length || duplicateCalendarTopics.length || calendarBlocks.length !== 30) {
  console.error("Review batch generated with warnings. See reports/strategy_library_review_batch_001.md");
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    totalBlocks: blocks.length,
    activeBlocks: activeBlocks.length,
    calendarBlocks: calendarBlocks.length,
    report: "reports/strategy_library_review_batch_001.md",
    jsonl: "data/strategy-library/review-batch-001.jsonl",
  }, null, 2));
}
