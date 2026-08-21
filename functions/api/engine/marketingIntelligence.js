import { onePick } from "./multiPick.js";

const SUPPORTED_GOALS = [
  "launch_business",
  "get_more_walkins",
  "get_more_whatsapp_messages",
  "get_more_bookings",
  "get_more_online_orders",
  "build_trust",
  "promote_offer",
  "get_repeat_customers",
  "get_google_reviews",
  "grow_instagram",
  "get_leads",
  "announce_new_product",
  "clear_old_stock",
  "get_weekend_customers",
  "build_personal_brand",
];

const CORE_SEED_GOALS = [
  "launch_business",
  "get_more_walkins",
  "get_more_whatsapp_messages",
  "get_more_bookings",
  "get_more_online_orders",
  "build_trust",
  "promote_offer",
  "get_repeat_customers",
  "get_google_reviews",
  "grow_instagram",
  "get_leads",
];

const PARENT_CATEGORIES = [
  "food_beverage",
  "appointment_service",
  "healthcare",
  "education",
  "retail",
  "local_service",
  "professional_service",
  "ecommerce",
  "software",
  "creator_personal_brand",
];

const BANNED_MARKETING_PHRASES = [
  "specific difference",
  "choose us",
  "this problem feels familiar",
  "being built for you",
  "show what is coming",
  "prototype",
  "first draft",
  "reply with your situation",
  "pain point",
  "solution for you",
  "unlock growth",
  "take your business to the next level",
  "best quality service",
  "contact us for more details",
  "we are here to help",
];

const NON_SOFTWARE_STARTUP_TERMS = [
  "mvp",
  "product-market fit",
  "roadmap",
  "beta",
  "feature launch",
];

const GOAL_ALIASES = {
  launch: "launch_business",
  awareness: "grow_instagram",
  "increase awareness": "launch_business",
  customers: "get_more_walkins",
  "increase footfall": "get_more_walkins",
  online_sales: "get_more_online_orders",
  sales: "get_more_online_orders",
  retention: "get_repeat_customers",
  "increase retention": "get_repeat_customers",
  credibility: "build_trust",
  trust: "build_trust",
  "build trust": "build_trust",
  leads: "get_leads",
  bookings: "get_more_bookings",
};

function clean(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text || text === "ANY" || text.toLowerCase() === "not provided") return fallback;
  return text;
}

function lower(value, fallback = "") {
  return clean(value, fallback).toLowerCase();
}

function flattenText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenText).join(" ");
  return "";
}

function firstUseful(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function template(text, context = {}) {
  return String(text || "")
    .replace(/\{\{businessName\}\}/g, context.businessName || "your business")
    .replace(/\{\{businessType\}\}/g, context.businessType || "business")
    .replace(/\{\{location\}\}/g, context.location || "your area")
    .replace(/\{\{city\}\}/g, context.city || context.location || "your area")
    .replace(/\{\{audience\}\}/g, context.audience || "customers")
    .replace(/\{\{offer\}\}/g, context.productsOrServices || "your product or service")
    .replace(/\{\{customerAction\}\}/g, context.customerAction || "message us");
}

function makeGoal({
  purpose,
  bestCustomerAction,
  calendarFlow,
  contentAngles,
  captionStyle,
  messageTemplateStyle,
  advancedGrowthActions,
  badIdeasToAvoid,
}) {
  return {
    purpose,
    bestCustomerAction,
    calendarFlow,
    contentAngles,
    captionStyle,
    messageTemplateStyle,
    advancedGrowthActions,
    badIdeasToAvoid,
  };
}

const GOAL_STRATEGIES = {
  launch_business: makeGoal({
    purpose: "Create awareness before launch and turn attention into the first serious customer actions.",
    bestCustomerAction: {
      food_beverage: "Follow for opening date",
      appointment_service: "WhatsApp for opening slots",
      healthcare: "Call the clinic for timing",
      education: "Message to book a demo class",
      retail: "DM to see launch stock",
      local_service: "WhatsApp to ask availability",
      professional_service: "Book a quick consultation",
      ecommerce: "Join the launch list",
      software: "Join early access",
      creator_personal_brand: "Follow for the first post",
    },
    calendarFlow: ["Curiosity", "Real preview", "How it works", "Trust proof", "Launch reminder", "First response"],
    contentAngles: ["founder reason", "first product or service preview", "local relevance", "simple order path", "first customer care"],
    captionStyle: "Short, honest, launch-focused, and easy to act on.",
    messageTemplateStyle: "Ask what the customer needs and give the simplest next step.",
    advancedGrowthActions: ["Open a small first batch", "Collect early questions", "Turn repeated questions into posts"],
    badIdeasToAvoid: ["big claims before real proof", "random countdown posts with no product or service detail"],
  }),
  get_more_walkins: makeGoal({
    purpose: "Give nearby people a clear reason to visit soon.",
    bestCustomerAction: {
      food_beverage: "Save the location",
      appointment_service: "Call before visiting",
      healthcare: "Call the clinic before visiting",
      education: "Visit for admission details",
      retail: "Visit the store this week",
      local_service: "Call for nearby service timing",
      professional_service: "Book a local meeting",
      ecommerce: "Check pickup availability",
      software: "Watch the demo",
      creator_personal_brand: "Attend the local session",
    },
    calendarFlow: ["Location clarity", "Reason to visit", "Product highlight", "Trust proof", "Local reminder", "Weekend push"],
    contentAngles: ["storefront or location", "nearby landmark", "today reason", "popular item", "review or customer moment"],
    captionStyle: "Local, clear, and tied to a visit reason.",
    messageTemplateStyle: "Confirm address, timing, and what is available today.",
    advancedGrowthActions: ["Google Business posts", "local group post", "review request after visit"],
    badIdeasToAvoid: ["posting only pretty visuals with no address or visit reason"],
  }),
  get_more_whatsapp_messages: makeGoal({
    purpose: "Make the first WhatsApp message easy and low-pressure.",
    bestCustomerAction: {
      food_beverage: "WhatsApp to order",
      appointment_service: "WhatsApp for available slots",
      healthcare: "WhatsApp for timing",
      education: "WhatsApp for batch details",
      retail: "WhatsApp to check availability",
      local_service: "WhatsApp a photo of the issue",
      professional_service: "WhatsApp for packages or process",
      ecommerce: "WhatsApp to check size or delivery",
      software: "WhatsApp for demo access",
      creator_personal_brand: "WhatsApp to join the list",
    },
    calendarFlow: ["First message prompt", "FAQ answer", "Price or timing clarity", "Proof", "Fast reply promise", "Follow-up"],
    contentAngles: ["exact message to send", "question sticker", "simple menu or service list", "before and after", "saved reply"],
    captionStyle: "Tell people exactly what to send.",
    messageTemplateStyle: "Use fill-in-the-blank messages that customers can copy.",
    advancedGrowthActions: ["Create WhatsApp quick replies", "Track repeated questions", "Reply within one working hour"],
    badIdeasToAvoid: ["asking people to explain too much before replying"],
  }),
  get_more_bookings: makeGoal({
    purpose: "Make people trust the service and reserve a time.",
    bestCustomerAction: {
      food_beverage: "Call to reserve",
      appointment_service: "WhatsApp for available slots",
      healthcare: "Book an appointment",
      education: "Book a demo class",
      retail: "Book a store visit",
      local_service: "Book the service",
      professional_service: "Book a consultation",
      ecommerce: "Book a styling call",
      software: "Book a demo",
      creator_personal_brand: "Book a session",
    },
    calendarFlow: ["Result proof", "Service explanation", "Price or timing", "Questions", "Reviews", "Last slots reminder"],
    contentAngles: ["real result", "service list", "available slots", "before and after where safe", "customer review"],
    captionStyle: "Result first, then slot and booking action.",
    messageTemplateStyle: "Ask date, service, area, and preferred time.",
    advancedGrowthActions: ["weekly slot post", "no-show reminder", "review after booking"],
    badIdeasToAvoid: ["talking only about skill without showing the booking step"],
  }),
  get_more_online_orders: makeGoal({
    purpose: "Move people from seeing the product to ordering online.",
    bestCustomerAction: {
      food_beverage: "WhatsApp to order",
      appointment_service: "Pay advance to reserve",
      healthcare: "Order prescribed item only through approved process",
      education: "Pay to reserve the seat",
      retail: "WhatsApp to order",
      local_service: "Book online",
      professional_service: "Request invoice or package",
      ecommerce: "Shop now",
      software: "Start trial",
      creator_personal_brand: "Buy the digital product",
    },
    calendarFlow: ["Product clarity", "Usage", "Trust", "Delivery or payment", "Offer", "Order reminder"],
    contentAngles: ["product in use", "size or variant", "delivery clarity", "reviews", "simple order steps"],
    captionStyle: "Product first, then price or delivery, then order action.",
    messageTemplateStyle: "Confirm item, size, delivery area, and payment step.",
    advancedGrowthActions: ["abandoned chat follow-up", "delivery FAQ post", "customer photo request"],
    badIdeasToAvoid: ["making people search for the order link or price"],
  }),
  build_trust: makeGoal({
    purpose: "Remove doubt and make the business feel safe, real, and reliable.",
    bestCustomerAction: {
      food_beverage: "Save this trust note",
      appointment_service: "Check recent results before booking",
      healthcare: "Book an appointment",
      education: "Book a demo class",
      retail: "Ask for real photos",
      local_service: "WhatsApp a photo of the issue",
      professional_service: "Ask for portfolio",
      ecommerce: "Read reviews before ordering",
      software: "Watch the demo",
      creator_personal_brand: "Read the proof post",
    },
    calendarFlow: ["Team/process", "Education", "Common doubts", "Transparency", "Reviews", "Consistency"],
    contentAngles: ["process proof", "team or founder", "review", "simple explainer", "behind the work"],
    captionStyle: "Calm, clear, proof-led.",
    messageTemplateStyle: "Answer the doubt before asking for payment or booking.",
    advancedGrowthActions: ["proof library", "FAQ highlight", "review collection habit"],
    badIdeasToAvoid: ["fear language", "claiming more than you can prove"],
  }),
  promote_offer: makeGoal({
    purpose: "Make the offer easy to understand and act on before it ends.",
    bestCustomerAction: {
      food_beverage: "WhatsApp to claim today",
      appointment_service: "Book before the weekend",
      healthcare: "Call to confirm availability",
      education: "Message for offer details",
      retail: "DM to reserve",
      local_service: "Book this week",
      professional_service: "Request the offer package",
      ecommerce: "Use the coupon",
      software: "Start trial",
      creator_personal_brand: "Claim the session",
    },
    calendarFlow: ["Offer reveal", "Value", "Proof", "Questions", "Reminder", "Referral"],
    contentAngles: ["what is included", "who it is for", "before and after where safe", "price clarity", "last date"],
    captionStyle: "Clear offer, clear deadline, clear action.",
    messageTemplateStyle: "Confirm the offer and explain what happens next.",
    advancedGrowthActions: ["offer FAQ", "warm lead follow-up", "review after offer purchase"],
    badIdeasToAvoid: ["fake scarcity", "discount with no explanation"],
  }),
  get_repeat_customers: makeGoal({
    purpose: "Give happy customers a reason to come back or refer someone.",
    bestCustomerAction: {
      food_beverage: "Visit again this week",
      appointment_service: "Book the next slot",
      healthcare: "Follow the advised checkup schedule",
      education: "Ask about the next batch",
      retail: "Save the next drop",
      local_service: "Book the next service date",
      professional_service: "Schedule the next review call",
      ecommerce: "Buy again with your code",
      software: "Set up your next workflow",
      creator_personal_brand: "Join the next session",
    },
    calendarFlow: ["Thank-you", "Next use case", "Reminder", "Referral", "Review", "Repeat offer"],
    contentAngles: ["customer thank-you", "usage reminder", "new arrivals", "monthly plan", "referral note"],
    captionStyle: "Warm, useful, and focused on a second action.",
    messageTemplateStyle: "Thank the customer and suggest the next useful step.",
    advancedGrowthActions: ["repeat reminder list", "referral script", "review request"],
    badIdeasToAvoid: ["only chasing new customers while ignoring happy buyers"],
  }),
  get_google_reviews: makeGoal({
    purpose: "Turn happy customers into public trust.",
    bestCustomerAction: {
      food_beverage: "Leave a Google review",
      appointment_service: "Leave a Google review",
      healthcare: "Share honest clinic feedback",
      education: "Share parent feedback",
      retail: "Leave a Google review",
      local_service: "Leave a Google review",
      professional_service: "Share a review",
      ecommerce: "Leave a product review",
      software: "Share a review",
      creator_personal_brand: "Share feedback",
    },
    calendarFlow: ["Why reviews matter", "Happy moment", "Ask after service", "Repost reviews", "Milestone", "Referral"],
    contentAngles: ["review request", "customer moment", "thank-you post", "Google profile screenshot", "review reminder"],
    captionStyle: "Grateful and direct.",
    messageTemplateStyle: "Ask after the customer has a good experience.",
    advancedGrowthActions: ["review QR code", "post-service review message", "monthly review count"],
    badIdeasToAvoid: ["asking cold audiences for reviews"],
  }),
  grow_instagram: makeGoal({
    purpose: "Make the Instagram page easier to understand, follow, and share.",
    bestCustomerAction: {
      food_beverage: "Follow for daily specials",
      appointment_service: "Follow for recent results",
      healthcare: "Follow for simple care tips",
      education: "Follow for study tips",
      retail: "Follow for new arrivals",
      local_service: "Follow for useful tips",
      professional_service: "Follow for work examples",
      ecommerce: "Follow for drops and offers",
      software: "Follow for product demos",
      creator_personal_brand: "Follow for daily lessons",
    },
    calendarFlow: ["Clear bio story", "Shareable post", "Proof", "Community", "Repeat format", "Collab"],
    contentAngles: ["simple reel", "behind the scenes", "top 3 tips", "poll", "customer result", "local collab"],
    captionStyle: "Short, shareable, and natural.",
    messageTemplateStyle: "Move warm followers into DM or WhatsApp only when useful.",
    advancedGrowthActions: ["weekly series", "collab post", "highlight cleanup"],
    badIdeasToAvoid: ["posting for likes without business action"],
  }),
  get_leads: makeGoal({
    purpose: "Get serious enquiries with enough information to follow up.",
    bestCustomerAction: {
      food_beverage: "WhatsApp for catering or group order",
      appointment_service: "Message for consultation",
      healthcare: "Book an appointment",
      education: "Message to book a demo class",
      retail: "DM to reserve",
      local_service: "Ask for an estimate",
      professional_service: "Book a consultation",
      ecommerce: "Join the buyer list",
      software: "Book a demo",
      creator_personal_brand: "Apply for a session",
    },
    calendarFlow: ["Problem clarity", "Proof", "Offer", "Question answer", "Lead magnet", "Follow-up"],
    contentAngles: ["who this is for", "result proof", "one clear package", "FAQ", "small form or WhatsApp prompt"],
    captionStyle: "Specific and enquiry-focused.",
    messageTemplateStyle: "Ask for name, need, location, and timing.",
    advancedGrowthActions: ["lead tracker", "follow-up script", "qualification questions"],
    badIdeasToAvoid: ["collecting weak enquiries with no next step"],
  }),
  announce_new_product: makeGoal({
    purpose: "Introduce the new item clearly and explain who should buy it.",
    bestCustomerAction: {},
    calendarFlow: ["Teaser", "Reveal", "Use case", "Trust", "Offer", "Reminder"],
    contentAngles: ["new item reveal", "how to use it", "who it is for", "price or availability"],
    captionStyle: "Simple reveal with one reason to care.",
    messageTemplateStyle: "Confirm availability, price, and delivery or booking step.",
    advancedGrowthActions: ["waitlist", "first customer photos", "FAQ post"],
    badIdeasToAvoid: ["announcing without showing the product clearly"],
  }),
  clear_old_stock: makeGoal({
    purpose: "Move slow stock without making the brand look desperate.",
    bestCustomerAction: {},
    calendarFlow: ["Stock reveal", "Styling/use", "Bundle", "Urgency", "Proof", "Last reminder"],
    contentAngles: ["available sizes", "real photos", "bundle idea", "limited quantity", "price clarity"],
    captionStyle: "Direct, visual, and stock-specific.",
    messageTemplateStyle: "Ask size, colour, pickup or delivery area.",
    advancedGrowthActions: ["bundle old stock with popular item", "WhatsApp status sale", "size-wise story highlights"],
    badIdeasToAvoid: ["unclear sale posts with no size or price"],
  }),
  get_weekend_customers: makeGoal({
    purpose: "Give people a weekend reason to visit, book, or order.",
    bestCustomerAction: {},
    calendarFlow: ["Monday plan", "Midweek reminder", "Friday push", "Saturday proof", "Sunday last call", "Review"],
    contentAngles: ["weekend offer", "slot availability", "group plan", "family or friends use case"],
    captionStyle: "Timely and local.",
    messageTemplateStyle: "Confirm weekend availability and timing.",
    advancedGrowthActions: ["Friday WhatsApp status", "Saturday Google post", "Sunday review request"],
    badIdeasToAvoid: ["posting the weekend offer after the weekend starts"],
  }),
  build_personal_brand: makeGoal({
    purpose: "Make the person easier to trust before the sale.",
    bestCustomerAction: {},
    calendarFlow: ["Story", "Point of view", "Proof", "Teaching", "Client example", "Call to talk"],
    contentAngles: ["lesson learned", "work process", "client result", "common mistake", "clear offer"],
    captionStyle: "Personal, simple, and useful.",
    messageTemplateStyle: "Invite a small conversation around one service or question.",
    advancedGrowthActions: ["weekly opinion series", "case story library", "consultation script"],
    badIdeasToAvoid: ["posting only motivational lines without service proof"],
  }),
};

function makeProblem(problem, why, solution, text, contentIdea) {
  return { problem, why, solution, text, contentIdea };
}

function makePack(data) {
  return {
    vocabulary: data.vocabulary,
    customerTypes: data.customerTypes,
    customerProblems: data.customerProblems,
    competitorAlternatives: data.competitorAlternatives,
    trustFactors: data.trustFactors,
    commonOffers: data.commonOffers,
    shootablePostIdeas: data.shootablePostIdeas,
    recommendedCTAs: data.recommendedCTAs,
    captionRules: data.captionRules,
    messageTemplateRules: data.messageTemplateRules,
    brandStyleRules: data.brandStyleRules,
    bannedTerms: data.bannedTerms || [],
  };
}

const INDUSTRY_PACKS = {
  food_beverage: makePack({
    vocabulary: ["menu", "dish", "taste", "fresh", "kitchen", "table", "dine-in", "takeaway", "delivery", "location", "opening day", "today's special", "family", "friends", "lunch", "dinner"],
    customerTypes: ["Nearby family", "Office lunch buyer", "Student group", "Weekend food explorer"],
    customerProblems: [
      makeProblem("They do not know what to try first.", "A new food place has many options, so people need one safe item.", "Show the hero dish with price and timing.", "Start with our most-loved plate. Save the location and visit this week.", "Record the hero dish being plated from kitchen to table."),
      makeProblem("They worry the place may not be clean.", "Food buyers trust kitchens they can see.", "Show kitchen cleanliness, packing, and fresh preparation.", "Here is how we prepare and pack today's food before it reaches your table.", "Film a 10-second clean kitchen and packing clip."),
      makeProblem("They forget the place after seeing one post.", "Food decisions are daily and crowded.", "Repeat location, timing, and signature item.", "Lunch plan in {{location}}? Save this before you forget.", "Show storefront, nearby landmark, and today's item."),
      makeProblem("They need a reason to visit now.", "People delay trying a new restaurant unless the next step is clear.", "Give a simple launch or weekend reason.", "This weekend, try the first plate people should remember us for.", "Post a weekend table shot with timing."),
    ],
    competitorAlternatives: [
      ["Nearby restaurant", "Already known locally", "Win with cleaner photos, opening offer, and faster WhatsApp replies."],
      ["Food delivery app options", "Easy to compare", "Win with a clear hero item and direct ordering details."],
      ["Home-cooked meal option", "Feels familiar", "Win with fresh taste, hygiene proof, and convenience."],
    ],
    trustFactors: ["taste", "cleanliness", "location", "price", "reviews", "food photos"],
    commonOffers: ["opening day tasting plate", "family combo", "student meal", "weekend special"],
    shootablePostIdeas: [
      ["Hero dish reveal", "Record the main dish being served hot on a clean table.", "People decide faster when they can see the exact dish."],
      ["Kitchen prep", "Film the staff preparing one item with clean hands, tools, and packing.", "Clean process reduces food doubts."],
      ["Location clip", "Show the storefront, nearby landmark, and how to reach the shop.", "Local people need to know where to go."],
      ["Menu clarity", "Photo the menu or three starter items with price and timing.", "Clear price makes the first visit easier."],
      ["Table moment", "Record a family or friends table setup without showing faces if not allowed.", "Food feels more real when people can imagine eating there."],
    ],
    recommendedCTAs: ["Follow for opening date", "Save the location", "Tag a friend", "Comment your favourite item", "WhatsApp to order", "Call to reserve", "Visit this weekend", "Check today's special"],
    captionRules: ["Mention the dish, location, timing, and next step."],
    messageTemplateRules: ["Ask item, quantity, pickup or delivery, and area."],
    brandStyleRules: ["Use warm food photos, clear prices, and local words."],
    bannedTerms: ["mvp", "roadmap", "users", "feature launch"],
  }),
  appointment_service: makePack({
    vocabulary: ["appointment", "slot", "result", "before and after", "consultation", "service", "style", "grooming", "hygiene", "comfort", "transformation"],
    customerTypes: ["Event-ready customer", "Regular grooming customer", "Careful first-time visitor", "Weekend booking customer"],
    customerProblems: [
      makeProblem("They worry the final look may not match the photo.", "Beauty and grooming decisions feel personal.", "Show real results and explain the service clearly.", "Planning a fresh look? Message us with the service and date to check slots.", "Show a client-safe result with service name and timing."),
      makeProblem("They want price and time before booking.", "People avoid appointments when cost or duration is unclear.", "Post starting price and expected time.", "Ask for the price list before booking. We will guide the right service.", "Make a service list story with starting prices."),
      makeProblem("They worry about hygiene.", "Customers need to feel comfortable before visiting.", "Show clean tools, towels, chairs, and setup.", "Clean setup matters. Here is how we prepare before every appointment.", "Record a 10-second hygiene setup clip."),
      makeProblem("They do not know which service to pick.", "Too many service names can confuse people.", "Ask their need and suggest the safest first option.", "Send the look or need you have in mind. We will suggest the right service.", "Create a 'which service fits you' carousel."),
    ],
    competitorAlternatives: [
      ["Nearby salon", "Known by local customers", "Win with clearer results, price, hygiene, and booking slots."],
      ["Home service provider", "Convenient", "Win with clean setup, better comfort, and visible service proof."],
      ["Cheaper walk-in option", "Looks affordable", "Win with result quality and appointment clarity."],
    ],
    trustFactors: ["real result", "hygiene", "skill", "reviews", "comfort", "price clarity"],
    commonOffers: ["first visit package", "weekend slot offer", "bridal or event consultation", "service combo"],
    shootablePostIdeas: [
      ["One real result", "Show a clean before-and-after of one haircut, facial, nail work, or makeover.", "People book faster when they can see the result."],
      ["Available slots", "Post this week's available appointment slots with the service name.", "Slots make booking feel immediate."],
      ["Clean setup", "Record the chair, tools, mirror, towels, and service area before opening.", "Hygiene proof builds comfort."],
      ["Service explainer", "Create a short carousel explaining one service: who it is for, time needed, and starting price.", "Simple service education removes doubt."],
      ["Review card", "Share one customer review with the service name and date.", "Reviews make first-time booking safer."],
    ],
    recommendedCTAs: ["DM to book", "WhatsApp for available slots", "Ask for price list", "Save this style", "Book before the weekend", "Call for appointment"],
    captionRules: ["Show result first, then mention service, slot, and booking action."],
    messageTemplateRules: ["Ask service, preferred date, time, and any event date."],
    brandStyleRules: ["Use clean visuals, real results, and calm confident text."],
    bannedTerms: ["mvp", "roadmap", "users", "feature launch"],
  }),
  healthcare: makePack({
    vocabulary: ["appointment", "consultation", "doctor", "care", "checkup", "prevention", "safety", "clinic timing", "treatment options", "clear explanation"],
    customerTypes: ["Careful patient", "Parent booking for family", "Repeat checkup patient", "Nearby emergency enquiry"],
    customerProblems: [
      makeProblem("They are nervous before booking.", "People want a clinic to feel safe and clear.", "Explain timing, doctor details, and what happens during the visit.", "Need a checkup? Call the clinic to book a safe appointment time.", "Show the reception, clinic room, and appointment process."),
      makeProblem("They do not know when to visit.", "Health questions feel confusing without simple guidance.", "Post safe education and ask them to consult for personal advice.", "If you are unsure, book a consultation and let the doctor guide you safely.", "Record the doctor explaining one common care tip."),
      makeProblem("They worry about safety and cleanliness.", "Cleanliness is a main trust factor.", "Show sterilisation, clean waiting area, and staff process without patient details.", "Here is how we keep the clinic ready before appointments.", "Show a clinic readiness checklist."),
      makeProblem("They need clear timing.", "Clinic visits depend on schedules.", "Post consultation timing and booking method.", "WhatsApp or call to check today's clinic timing before visiting.", "Create a timing story and pin it."),
    ],
    competitorAlternatives: [
      ["Nearby clinic", "Already has trust", "Win with clearer timing, doctor credibility, and simple education."],
      ["Hospital visit", "Feels safer for serious needs", "Win for suitable routine consultation by explaining care and booking clearly."],
      ["Self-search online", "Fast answers", "Win with calm guidance and proper appointment path."],
    ],
    trustFactors: ["doctor credibility", "safety", "clear explanation", "reviews", "clean clinic", "timing clarity"],
    commonOffers: ["checkup camp", "consultation slot", "family dental checkup", "preventive care day"],
    shootablePostIdeas: [
      ["Clinic readiness", "Show the clean waiting area, reception, and appointment desk before opening.", "People trust a clinic they can see."],
      ["Doctor explains one doubt", "Record the doctor explaining one common question in simple words.", "Education builds calm trust."],
      ["Timing clarity", "Post clinic hours and how to book an appointment today.", "Clear timing reduces hesitation."],
      ["Safety process", "Show safe cleaning or sterilisation steps without patient details.", "Safety proof matters in healthcare."],
      ["Review thank-you", "Share a simple review thank-you without revealing private patient details.", "Public trust grows from careful feedback."],
    ],
    recommendedCTAs: ["Book an appointment", "Call the clinic", "WhatsApp for timing", "Save this health tip", "Share with someone who needs this"],
    captionRules: ["No cure promises. Keep it safe and consultation-led."],
    messageTemplateRules: ["Ask timing, appointment date, and doctor availability. Do not diagnose in chat."],
    brandStyleRules: ["Use calm colours, clear explanations, and privacy-safe proof."],
    bannedTerms: ["guaranteed cure", "instant result", "mvp", "roadmap", "users"],
  }),
  education: makePack({
    vocabulary: ["demo class", "batch timing", "teacher", "subject", "syllabus", "parent trust", "exam", "result", "admission", "practice"],
    customerTypes: ["Parent comparing tutors", "Student preparing for exams", "Admission enquiry parent", "Weak-subject student"],
    customerProblems: [
      makeProblem("Parents worry about personal attention.", "Large batches can make students feel unseen.", "Show class size, doubt clearing, and teacher style.", "Message to book a demo class and check the batch timing.", "Record the teacher explaining how doubts are handled."),
      makeProblem("Students need to see the teaching style.", "They trust a teacher faster after seeing one clear explanation.", "Solve one exam question step by step.", "Here is one question many students get wrong. Save it and ask for demo class timing.", "Record one board or notebook explanation under 30 seconds."),
      makeProblem("Parents want proof of improvement.", "Education trust comes from method, consistency, and feedback.", "Show worksheets, progress review, and parent updates.", "At {{businessName}}, parents get clear updates instead of guessing.", "Show a sample progress update format."),
      makeProblem("Admission details feel unclear.", "Parents need timing, fees, subjects, and contact path.", "Post batch details in one simple card.", "Send the class and subject. We will share batch timing and admission details.", "Create a batch timing carousel."),
    ],
    competitorAlternatives: [
      ["Nearby tuition center", "Known by parents", "Win with teaching clips, personal attention, and clear demo class path."],
      ["Online classes", "Convenient", "Win with local teacher access and doubt clearing."],
      ["Private tutor", "Personal attention", "Win with structure, syllabus, and regular updates."],
    ],
    trustFactors: ["teacher credibility", "results", "parent trust", "safety", "syllabus clarity", "personal attention"],
    commonOffers: ["free demo class", "admission week", "batch starter pack", "exam revision session"],
    shootablePostIdeas: [
      ["Solve one question", "Show the teacher solving one common exam question step by step.", "Parents and students trust teaching they can see."],
      ["Batch timing card", "Post subject, class, batch time, and demo class step.", "Clear admission details bring better enquiries."],
      ["Doubt clearing clip", "Record how one student doubt is explained on board or notebook.", "Personal attention becomes visible."],
      ["Parent update example", "Show a sample progress update message without student details.", "Parents want communication proof."],
      ["Teacher intro", "Record the teacher explaining what students will improve first.", "Teacher credibility starts the enquiry."],
    ],
    recommendedCTAs: ["Book a demo class", "Ask batch timing", "Message for admission details", "Save this exam tip", "Share with a parent"],
    captionRules: ["Show teaching style, class/subject, and demo class action."],
    messageTemplateRules: ["Ask class, subject, school board, area, and preferred timing."],
    brandStyleRules: ["Use teacher-led proof, simple academic language, and parent-friendly clarity."],
    bannedTerms: ["mvp", "roadmap", "users", "feature launch"],
  }),
  retail: makePack({
    vocabulary: ["new arrival", "size", "colour", "material", "price", "store visit", "DM to order", "stock", "style", "real photos"],
    customerTypes: ["Style-conscious buyer", "Budget buyer", "Last-piece buyer", "Store visit customer"],
    customerProblems: [
      makeProblem("They need real photos before buying.", "Edited product photos can make people doubt quality.", "Show the item in hand, on hanger, or in natural light.", "Want this piece? DM your size and we will confirm availability.", "Show three pieces on hanger with size and price."),
      makeProblem("They do not know if size is available.", "Retail enquiries depend on stock clarity.", "Mention size, colour, and quantity left.", "Send your size. We will confirm if it is available today.", "Make a size-wise stock story."),
      makeProblem("Old stock needs a fresh reason.", "People ignore stock they have seen before.", "Style it in a new way or bundle it.", "Last pieces are available in selected sizes. DM to reserve before visiting.", "Show one item styled three ways."),
      makeProblem("They compare with cheaper shops.", "Retail buyers need material and fit proof.", "Show fabric, stitching, fit, and customer photo where allowed.", "See the material clearly before you decide.", "Record a close-up fabric and fit video."),
    ],
    competitorAlternatives: [
      ["Nearby store", "Easy to visit", "Win with better stock clarity, real photos, and fast replies."],
      ["Online marketplace", "Many options", "Win with local trust, real item videos, and easier size check."],
      ["Cheaper seller", "Lower price", "Win with material proof, styling, and exchange clarity."],
    ],
    trustFactors: ["style", "size availability", "price", "material", "real photos", "exchange clarity"],
    commonOffers: ["clearance bundle", "new arrival drop", "festival collection", "last pieces offer"],
    shootablePostIdeas: [
      ["Real stock wall", "Show available pieces on a rack with size and colour labels.", "Stock clarity creates faster DMs."],
      ["Style one item", "Show one item styled in three simple ways.", "People buy when they imagine using it."],
      ["Material close-up", "Record fabric, stitching, finish, or product detail in natural light.", "Material proof reduces doubt."],
      ["Last pieces story", "Post last available sizes and ask people to reserve.", "Clear quantity makes old stock move."],
      ["Store visit clip", "Show the shop entrance, rack, trial area, and payment counter.", "People visit faster when the store feels real."],
    ],
    recommendedCTAs: ["DM for size", "WhatsApp to order", "Visit the store", "Save this outfit", "Ask for real photos", "Reserve this piece"],
    captionRules: ["Mention size, material, price or stock status when useful."],
    messageTemplateRules: ["Ask size, colour, delivery area, and pickup or shipping choice."],
    brandStyleRules: ["Use real product visuals, stock clarity, and simple style language."],
    bannedTerms: ["mvp", "roadmap", "users", "feature launch"],
  }),
  local_service: makePack({
    vocabulary: ["booking", "service area", "service team", "before and after", "estimate", "visit charge", "repair", "cleaning", "timing", "guarantee where true"],
    customerTypes: ["Urgent service seeker", "Careful homeowner", "Repeat maintenance customer", "Price-checking lead"],
    customerProblems: [
      makeProblem("They worry the price may change later.", "Local service customers dislike surprise charges.", "Explain estimate, visit charge, and what changes the final price.", "WhatsApp a photo of the issue and your area. We will guide the next step clearly.", "Show a simple estimate example."),
      makeProblem("They worry about trust.", "People invite service providers into homes or give valuable items.", "Show service team, process, reviews, and work proof.", "See the process before you book. We keep the steps clear.", "Record one real job process without private details."),
      makeProblem("They need fast timing.", "Repair and cleaning jobs often feel urgent.", "Post availability and area coverage.", "Need service today? Send your area and preferred time.", "Create a daily availability story."),
      makeProblem("They do not know what to send.", "Bad first messages slow down the booking.", "Tell them exactly what photo or detail to send.", "Send one photo, your area, and the best time. We will reply with the next step.", "Make a 'what to send on WhatsApp' post."),
    ],
    competitorAlternatives: [
      ["Nearby service team or cleaner", "Easy to call", "Win with clearer process, reviews, and estimate rules."],
      ["App-based service", "Convenient booking", "Win with local speed, direct WhatsApp, and personal follow-up."],
      ["Cheaper unlisted provider", "Looks affordable", "Win with trust, proof, and clear terms."],
    ],
    trustFactors: ["clear estimate", "service team proof", "reviews", "area coverage", "timing", "before-and-after work"],
    commonOffers: ["first booking inspection", "weekend slot", "monthly maintenance", "service bundle"],
    shootablePostIdeas: [
      ["Problem and fix", "Show the issue before work and the final fixed or cleaned result.", "Before-and-after proof builds trust."],
      ["Service team process", "Record the service team explaining one common issue in simple words.", "People trust a clear expert."],
      ["What to send", "Show the photo, area, and timing details customers should WhatsApp.", "Better first messages make booking faster."],
      ["Area coverage", "Post the areas you serve and the best booking times.", "Local clarity brings relevant enquiries."],
      ["Review proof", "Share one review with the job type and area, without private details.", "Local proof reduces risk."],
    ],
    recommendedCTAs: ["WhatsApp a photo of the issue", "Book the service", "Call for timing", "Ask for an estimate", "Share your area", "Save this service tip"],
    captionRules: ["Mention issue, area, timing, and booking step."],
    messageTemplateRules: ["Ask issue photo, area, preferred time, and urgency."],
    brandStyleRules: ["Use proof, clear process, and practical service photos."],
    bannedTerms: ["mvp", "roadmap", "users", "feature launch"],
  }),
  professional_service: makePack({
    vocabulary: ["consultation", "portfolio", "case example", "quote", "process", "timeline", "client result", "site visit", "proposal", "meeting"],
    customerTypes: ["Serious lead", "Price-checking lead", "Referral lead", "Business owner"],
    customerProblems: [
      makeProblem("They do not know if you can handle their case.", "Service buyers need relevant examples.", "Show a simple portfolio or case story.", "Want help with this? Book a short consultation and we will explain the process.", "Show one previous work example with outcome and timeline."),
      makeProblem("They worry about hidden cost or delay.", "Projects need clarity before payment.", "Explain package, timeline, and what is included.", "Send your requirement and we will share the process, timeline, and next step.", "Make a process carousel."),
      makeProblem("They compare many providers.", "Professional service buyers need trust and clarity.", "Show proof, communication style, and a clear first call.", "Ask for our portfolio before deciding.", "Post a client question and answer it."),
      makeProblem("They do not know what to ask first.", "Leads become weak when the first message is vague.", "Give a clear enquiry format.", "Send your goal, location, budget range, and deadline so we can guide you properly.", "Post a 'what to send before quote' card."),
    ],
    competitorAlternatives: [
      ["Larger agency", "Looks established", "Win with clearer communication, personal attention, and relevant work examples."],
      ["Cheaper freelancer", "Looks affordable", "Win with process, reliability, and proof."],
      ["Referral provider", "Feels trusted", "Win with visible portfolio and a simple consultation path."],
    ],
    trustFactors: ["proof", "case studies", "clarity", "reliability", "timeline", "process"],
    commonOffers: ["quick consultation", "starter package", "audit session", "portfolio review"],
    shootablePostIdeas: [
      ["Case example", "Show one project or client situation, what was done, and the result.", "Relevant examples create better leads."],
      ["Process steps", "Post the exact steps from enquiry to delivery.", "Clear process reduces doubt."],
      ["Portfolio proof", "Share 3 work samples with simple notes.", "Proof beats broad claims."],
      ["Quote checklist", "Show what details customers should send before asking for a quote.", "Better inputs create better enquiries."],
      ["Founder point of view", "Record a short lesson learned from serving one type of client.", "Thoughtful advice builds authority."],
    ],
    recommendedCTAs: ["Book a consultation", "Request a quote", "Ask for portfolio", "Send your requirement", "Schedule a quick call"],
    captionRules: ["Mention service, proof, timeline, and enquiry step."],
    messageTemplateRules: ["Ask requirement, goal, location, budget range, and deadline."],
    brandStyleRules: ["Use clear proof, calm authority, and short project examples."],
    bannedTerms: ["mvp"],
  }),
  ecommerce: makePack({
    vocabulary: ["shop now", "size guide", "delivery", "returns", "new drop", "cart", "coupon", "review", "product photo", "order tracking"],
    customerTypes: ["First-time online buyer", "Style buyer", "Gift buyer", "Offer seeker"],
    customerProblems: [
      makeProblem("They worry the product may not look the same.", "Online buyers need real photos and reviews.", "Show product on real person, in hand, and in natural light.", "Check the real product video before ordering.", "Record product front, back, fabric, and fit."),
      makeProblem("They need size and return clarity.", "Online clothing orders fail when size is confusing.", "Show size guide and exchange steps.", "Check the size guide before ordering. Message us if you are unsure.", "Create a size guide carousel."),
      makeProblem("They compare with marketplaces.", "Buyers need a reason to trust a direct brand.", "Show reviews, delivery, packaging, and support.", "Order directly for clear support and real product updates.", "Show packing and dispatch process."),
      makeProblem("They leave without ordering.", "Online buyers get distracted quickly.", "Use simple product pages and follow-up messages.", "Saved this item? Message your size and we will check availability.", "Post a cart reminder story."),
    ],
    competitorAlternatives: [
      ["Marketplace seller", "Huge choice", "Win with better photos, support, and brand trust."],
      ["Instagram store", "Fast trend posts", "Win with size guide, return clarity, and customer proof."],
      ["Cheaper copy seller", "Lower price", "Win with fabric proof, reviews, and delivery reliability."],
    ],
    trustFactors: ["product quality", "delivery", "reviews", "returns", "price", "real photos"],
    commonOffers: ["first order coupon", "free shipping threshold", "new drop", "bundle offer"],
    shootablePostIdeas: [
      ["Real product video", "Record the item in natural light from front, back, and detail angle.", "Online buyers trust real videos."],
      ["Size guide post", "Show size chart and how to choose if between sizes.", "Size clarity reduces order doubt."],
      ["Packing order", "Record one order being packed and labelled.", "Delivery proof builds trust."],
      ["Customer photo", "Share a customer photo or review with permission.", "Social proof helps first orders."],
      ["Shop path", "Screen-record how to choose item, size, and checkout.", "A simple buying path increases orders."],
    ],
    recommendedCTAs: ["Shop now", "Use coupon", "Check size guide", "Add to cart", "WhatsApp for size help", "Save this drop"],
    captionRules: ["Mention product, size or delivery clarity, and buying action."],
    messageTemplateRules: ["Ask size, colour, delivery PIN code, and payment preference."],
    brandStyleRules: ["Use real product media, customer proof, and simple buying instructions."],
    bannedTerms: ["mvp", "roadmap", "feature launch"],
  }),
  software: makePack({
    vocabulary: ["demo", "trial", "setup", "workflow", "dashboard", "support", "automation", "integration", "use case", "team"],
    customerTypes: ["Small business owner", "Founder", "Busy operator", "Team lead"],
    customerProblems: [
      makeProblem("They do not understand the product fast enough.", "Software buyers leave when the first use case is unclear.", "Show one screen and one job it completes.", "Watch the short demo and see if this saves time for your team.", "Record a 15-second screen demo of one useful workflow."),
      makeProblem("They worry setup will take too long.", "Small teams avoid tools that feel heavy.", "Show setup steps and the first useful result.", "Start with one simple workflow before adding anything else.", "Post setup steps from account to first result."),
      makeProblem("They need proof before trying.", "Software trust comes from demos, user stories, and support clarity.", "Show real examples and support path.", "Book a demo if you want to see this on your own workflow.", "Share one simple user story."),
      makeProblem("They compare with spreadsheets or manual work.", "The old way feels familiar even when slow.", "Show before and after time saved.", "See the old way beside the faster way in one short demo.", "Record old workflow vs product workflow."),
    ],
    competitorAlternatives: [
      ["Manual spreadsheet", "Familiar and free", "Win by showing time saved and fewer repeated steps."],
      ["Large software tool", "Feature-rich", "Win with simpler setup and faster support."],
      ["Hiring someone manually", "Flexible", "Win by showing repeatable tasks handled faster."],
    ],
    trustFactors: ["feature clarity", "proof", "ease of use", "support", "security explanation", "short demo"],
    commonOffers: ["free trial", "demo call", "early access", "starter workflow", "setup help"],
    shootablePostIdeas: [
      ["One-screen demo", "Record a 15-second screen video showing one workflow from start to finish.", "Software is clearer when people see the exact result."],
      ["Before and after", "Show the manual method beside the faster product workflow.", "Comparison helps buyers understand value."],
      ["Setup steps", "Show the first three setup steps and the first useful result.", "Simple setup removes fear."],
      ["Use case post", "Create a simple post showing one user type, one task, and one result.", "Specific use cases bring better signups."],
      ["Support proof", "Show how a new customer gets help after signing up.", "Support clarity makes trials safer."],
    ],
    recommendedCTAs: ["Sign up", "Book demo", "Start trial", "Watch demo", "Join early access", "Ask for setup help"],
    captionRules: ["Mention the workflow, time saved, demo, and next step."],
    messageTemplateRules: ["Ask current workflow, team size, and what result they want first."],
    brandStyleRules: ["Use product screens, simple demo text, and practical outcomes."],
    bannedTerms: [],
  }),
  creator_personal_brand: makePack({
    vocabulary: ["lesson", "story", "session", "newsletter", "community", "audience", "case story", "comment", "share", "save"],
    customerTypes: ["Follower who needs guidance", "Warm lead", "Community member", "Event attendee"],
    customerProblems: [
      makeProblem("They do not know what you stand for.", "People follow when the value is clear.", "Share one clear point of view with a real story.", "If this lesson helps, save it and follow for the next one.", "Record a short story with one lesson."),
      makeProblem("They need proof before buying a session.", "Personal brands sell trust first.", "Show client examples, testimonials, or work process.", "See how one session works before booking.", "Show a sample session structure."),
      makeProblem("They forget to act after liking a post.", "Content must connect to one next step.", "End with a simple comment, DM, or booking action.", "Comment the word guide and I will send the next step.", "Create a post with one clear DM word."),
      makeProblem("They need simple repeated themes.", "Random posts confuse followers.", "Use weekly themes that repeat.", "Every week, I share one lesson, one example, and one action.", "Post the weekly content map."),
    ],
    competitorAlternatives: [
      ["Larger creator", "More visible", "Win with personal replies and clearer niche."],
      ["Free content", "Easy to consume", "Win with structured guidance and proof."],
      ["Coach or consultant", "Direct help", "Win with a clear personal method and examples."],
    ],
    trustFactors: ["proof", "clear point of view", "consistency", "personal story", "results", "simple offer"],
    commonOffers: ["intro session", "newsletter", "community invite", "consultation call"],
    shootablePostIdeas: [
      ["One lesson story", "Record a short story ending with one lesson people can use today.", "Helpful stories build memory."],
      ["Client example", "Share one client situation and what changed, without private details.", "Proof creates trust."],
      ["Weekly theme", "Post the three topics you will cover this week.", "Consistency helps people follow."],
      ["Behind the method", "Show your notes, framework, or preparation for a session.", "Process makes expertise visible."],
      ["Question post", "Ask one simple question your audience can answer in comments.", "Conversation warms future leads."],
    ],
    recommendedCTAs: ["Follow for the next lesson", "Comment your question", "Book a session", "Join the newsletter", "Share this with a friend"],
    captionRules: ["Use a story, one lesson, and one action."],
    messageTemplateRules: ["Ask their goal, current situation, and what help they want."],
    brandStyleRules: ["Use personal voice, proof, and repeated simple themes."],
    bannedTerms: [],
  }),
};

const BRIEF_SUBTYPE_CONFIG = {
  d2c_skincare: {
    businessType: "D2C skincare brand",
    parentCategory: "ecommerce",
    productsOrServices: "mineral SPF sunscreen and fragrance-free skincare products",
    primaryCTA: "Shop the sunscreen online",
    pack: {
      vocabulary: ["sunscreen", "SPF", "mineral formula", "ingredients", "fragrance-free", "skin feel", "application", "product texture", "delivery", "returns", "review", "order"],
      customerTypes: ["First-time sunscreen buyer", "Ingredient-conscious skincare buyer", "Humid-weather skincare buyer", "Repeat online buyer"],
      customerProblems: [
        makeProblem("They do not know how the sunscreen feels on skin.", "Online skincare buyers need to see texture, finish, and application before ordering.", "Show the mineral formula being applied in natural light.", "See the texture and finish before you order the sunscreen online.", "Record one real application showing texture and finish."),
        makeProblem("They want ingredient and SPF clarity.", "A vague formula description makes skincare claims hard to trust.", "Explain the listed ingredients, SPF information, and intended use without medical promises.", "Check the ingredient and SPF details before adding the sunscreen to your cart.", "Create a simple ingredient and SPF explainer."),
        makeProblem("They worry the delivered product may not match the page.", "Direct buyers need real product media, packaging proof, and clear delivery information.", "Show the actual pack, label, seal, dispatch process, and delivery steps.", "Review the real product and delivery details before ordering.", "Film the product pack and dispatch process."),
        makeProblem("They need confidence about returns and support.", "Clear returns and responsive support reduce risk for a first online order.", "State the return rules and show how customer questions are answered.", "Read the returns information or ask for product help before checkout.", "Post a returns and support FAQ."),
      ],
      competitorAlternatives: [
        ["Marketplace sunscreen", "It is easy to compare quickly", "Win with real formula details, product media, reviews, delivery, and returns clarity."],
        ["Large skincare brand", "It already feels familiar", "Win with focused humid-weather use, ingredient clarity, and responsive support."],
        ["Cheaper sunscreen", "The price feels safer", "Win with transparent formula information, real application proof, and reliable fulfilment."],
      ],
      trustFactors: ["ingredient transparency", "SPF information", "real application proof", "customer reviews", "returns clarity", "delivery reliability"],
      commonOffers: ["first online order", "sunscreen bundle", "shipping offer", "repeat purchase reminder"],
      shootablePostIdeas: [
        ["Texture and finish", "Record the sunscreen texture and application in natural light.", "Real application proof helps buyers judge the formula."],
        ["Ingredient explainer", "Show the label and explain the listed ingredients in plain language.", "Ingredient transparency builds trust without medical claims."],
        ["SPF information", "Create a card showing the stated SPF information and intended use.", "Clear product information supports a careful buying decision."],
        ["Packing an order", "Record the sealed product being packed and labelled for dispatch.", "Fulfilment proof makes delivery feel reliable."],
        ["Review and returns", "Share a permitted customer review beside the return and support steps.", "Reviews and returns clarity reduce first-order risk."],
      ],
      recommendedCTAs: ["Shop the sunscreen online", "Add the sunscreen to cart", "Order online", "Check the ingredient details", "Read delivery and returns information", "Ask for product help"],
      captionRules: ["Name the sunscreen or formula, show real product detail, and end with an online buying action."],
      messageTemplateRules: ["Ask about skin feel preference, product information, delivery PIN code, and order support without making medical claims."],
      brandStyleRules: ["Use real product visuals, ingredient transparency, restrained claims, and clear delivery and returns information."],
      bannedTerms: ["guaranteed result", "guaranteed cure", "treats acne", "instant result"],
    },
  },
  physiotherapy: {
    businessType: "physiotherapy practice",
    parentCategory: "healthcare",
    productsOrServices: "physiotherapy assessment, rehabilitation, mobility plans, and guided exercise",
    primaryCTA: "Book a physiotherapy assessment",
    pack: {
      vocabulary: ["physiotherapy", "physiotherapist", "assessment", "rehabilitation", "mobility", "guided exercise", "sports injury", "recovery plan", "pain management", "safety", "appointment", "progress"],
      customerTypes: ["Runner with a sports injury", "Desk worker with a mobility concern", "Adult returning to activity", "Recovery-plan patient"],
      customerProblems: [
        makeProblem("They are unsure whether physiotherapy fits their concern.", "People need a clear assessment step before assuming a rehabilitation plan.", "Explain what a physiotherapist checks during the first assessment.", "Book a physiotherapy assessment to understand the safe next step.", "Record the physiotherapist explaining the assessment process."),
        makeProblem("They worry exercise may aggravate the injury.", "Recovery feels risky without guided movement and safety boundaries.", "Show how mobility and exercise plans are adapted after assessment.", "Ask how guided exercise is adjusted for your recovery stage.", "Film a safe mobility demonstration with clear limits."),
        makeProblem("They want evidence of professional credentials.", "Healthcare trust depends on who performs the assessment and how decisions are explained.", "Show physiotherapist credentials, scope, and the consultation process.", "Review the physiotherapist credentials before booking an assessment.", "Create a credentials and assessment-process card."),
        makeProblem("They do not know how recovery progress is reviewed.", "A clear review plan makes rehabilitation feel measurable and responsible.", "Explain exercise-plan reviews, mobility checks, and progress notes.", "Ask how the recovery plan and exercises will be reviewed.", "Show a privacy-safe sample progress review."),
      ],
      competitorAlternatives: [
        ["General clinic", "It feels familiar", "Win with physiotherapy credentials, movement assessment, and rehabilitation-plan clarity."],
        ["Online exercise video", "It is immediate and free", "Win with individual assessment, safety guidance, and progress review."],
        ["Waiting without support", "It avoids an appointment", "Win by explaining when a professional assessment can clarify the next step."],
      ],
      trustFactors: ["physiotherapist credentials", "assessment quality", "exercise-plan clarity", "safety guidance", "recovery evidence", "progress review"],
      commonOffers: ["first physiotherapy assessment", "mobility review", "sports injury rehabilitation plan", "guided exercise review"],
      shootablePostIdeas: [
        ["Assessment walkthrough", "Show the physiotherapist explaining the first assessment without exposing patient details.", "A visible assessment process reduces uncertainty."],
        ["Mobility education", "Record one general mobility principle with safety limits.", "Useful education shows expertise without diagnosing online."],
        ["Credentials and scope", "Show the physiotherapist credentials and the concerns the practice assesses.", "Professional credentials are a core trust factor."],
        ["Exercise-plan review", "Show a privacy-safe example of how guided exercises and progress are reviewed.", "Review clarity makes rehabilitation feel responsible."],
        ["Recovery evidence", "Share a consented recovery story focused on process and progress, not guarantees.", "Careful evidence builds trust without promising outcomes."],
      ],
      recommendedCTAs: ["Book a physiotherapy assessment", "Ask about the assessment process", "Schedule a mobility consultation", "Review the physiotherapist credentials", "Ask how guided exercise works", "Call for appointment timing"],
      captionRules: ["Use assessment-led, safety-conscious language and never diagnose or guarantee recovery in a post."],
      messageTemplateRules: ["Ask about the concern, timing, assessment availability, and relevant safety information; do not diagnose in chat."],
      brandStyleRules: ["Use calm clinical visuals, qualified physiotherapist proof, safe exercise education, and privacy-safe recovery evidence."],
      bannedTerms: ["guaranteed recovery", "guaranteed cure", "instant recovery"],
    },
  },
  b2b_solar: {
    businessType: "B2B solar installation service",
    parentCategory: "professional_service",
    productsOrServices: "B2B rooftop solar survey, system design, installation, net-metering, and DISCOM approval",
    primaryCTA: "Request a rooftop solar site survey",
    pack: {
      vocabulary: ["rooftop solar", "solar panels", "site survey", "electricity bill", "generation estimate", "system design", "EPC", "DISCOM approval", "net-metering", "installation safety", "warranty", "ROI proposal"],
      customerTypes: ["Factory owner", "Operations head", "Facility manager", "Commercial electricity buyer"],
      customerProblems: [
        makeProblem("They do not know whether the roof and load profile are suitable.", "A B2B solar decision needs site, roof, and daytime electricity-use facts.", "Start with a rooftop site survey and electricity-bill review.", "Request a rooftop solar site survey and share the recent electricity bill.", "Show the site-survey checklist for a commercial roof."),
        makeProblem("They cannot judge the generation estimate.", "Buyers need assumptions, system size, and expected generation explained clearly.", "Show a transparent generation estimate with the inputs used.", "Ask for a generation estimate and ROI proposal based on the site and bill.", "Create an annotated generation-estimate example."),
        makeProblem("They worry approvals will delay commissioning.", "Net-metering and DISCOM steps affect the project timeline.", "Explain approval ownership, documents, milestones, and expected dependencies.", "Ask how net-metering and DISCOM approval will be managed.", "Publish an approval and commissioning timeline."),
        makeProblem("They need confidence in installation quality and support.", "A commercial energy asset requires EPC credentials, safety process, warranties, and after-sales clarity.", "Show EPC credentials, installation safety controls, equipment warranties, and handover support.", "Review the EPC credentials, safety process, and warranty terms before approving the proposal.", "Record a safety-led installation walkthrough."),
      ],
      competitorAlternatives: [
        ["Large national EPC", "It feels established", "Win with relevant commercial references, clear ownership, and responsive project communication."],
        ["Lowest-price installer", "The capital cost looks smaller", "Win with generation assumptions, equipment detail, safety, approvals, and warranty clarity."],
        ["Delay the project", "It avoids a capital decision", "Win with a site-specific ROI proposal and transparent constraints."],
      ],
      trustFactors: ["EPC credentials", "site-specific generation estimate", "DISCOM approval process", "installation safety", "equipment warranty", "commercial project references"],
      commonOffers: ["rooftop site survey", "electricity-bill review", "generation and ROI proposal", "approval-readiness review"],
      shootablePostIdeas: [
        ["Commercial site survey", "Show the roof, electrical room, access, and survey checklist with permission.", "A visible survey process proves project discipline."],
        ["Generation estimate", "Record an explanation of the inputs behind one anonymised generation estimate.", "Transparent assumptions make the proposal easier to evaluate."],
        ["Approval steps", "Create a map of net-metering and DISCOM approval documents and owners.", "Approval clarity reduces timeline uncertainty."],
        ["Installation safety", "Show PPE, access controls, mounting checks, and electrical safety steps.", "Safety proof strengthens EPC credibility."],
        ["Warranty and handover", "Show equipment warranty documents and the commissioning handover checklist.", "Warranty and support clarity reduce long-term risk."],
      ],
      recommendedCTAs: ["Request a rooftop solar site survey", "Send an electricity bill for review", "Send an electricity bill for a site-specific generation and ROI proposal", "Ask for a generation and ROI proposal", "Request an EPC credentials deck", "Discuss net-metering and DISCOM approval", "Request a commercial solar quote"],
      captionRules: ["Name the commercial use case, show a site-specific proof point, state assumptions, and end with a qualified B2B enquiry action."],
      messageTemplateRules: ["Ask for site location, roof type, recent electricity bill, daytime load, approval status, and decision timeline."],
      brandStyleRules: ["Use engineering proof, transparent assumptions, safety documentation, approval clarity, and credible commercial references."],
      bannedTerms: ["guaranteed savings", "guaranteed generation", "instant approval"],
    },
  },
  nonprofit_education: {
    businessType: "nonprofit education program",
    parentCategory: "education",
    productsOrServices: "free mentor-led digital-skills cohort with learner safeguarding",
    primaryCTA: "Apply for the free digital-skills cohort",
    pack: {
      vocabulary: ["free cohort", "digital skills", "learner", "mentor-led", "application", "eligibility", "safeguarding", "learning support", "referral", "volunteer", "partner", "nonprofit"],
      customerTypes: ["Eligible learner", "Community referrer", "Volunteer mentor", "Education partner"],
      customerProblems: [
        makeProblem("Learners do not know whether they are eligible.", "A free cohort still needs clear eligibility, dates, and application steps.", "Publish the learner criteria and a simple application path.", "Check eligibility and apply for the free digital-skills cohort.", "Create an eligibility and application card."),
        makeProblem("Learners and families need to trust the environment.", "Safeguarding and mentor support are essential for a responsible education program.", "Explain learner safeguarding, mentor conduct, support, and reporting routes.", "Read the safeguarding and mentor-support information before applying.", "Record a safeguarding and learner-support explainer."),
        makeProblem("People may assume the free program promises employment.", "Clear outcome boundaries protect learners and the nonprofit.", "Explain the skills, learning support, and evidence of participation without promising jobs.", "Review what the cohort teaches and what it does not promise before applying.", "Post a clear learning-outcomes and boundaries card."),
        makeProblem("Supporters do not know how to help.", "Referrers, volunteers, and partners need distinct next steps.", "Publish separate referral, volunteer, and partner actions.", "Refer an eligible learner, volunteer as a mentor, or ask about partnership.", "Create a three-path supporter post."),
      ],
      competitorAlternatives: [
        ["Paid digital course", "It may offer more schedules", "Win with no-fee access, mentor support, safeguarding, and transparent eligibility."],
        ["Unstructured free videos", "They are easy to access", "Win with a cohort structure, mentors, learner support, and accountable participation."],
        ["Doing nothing yet", "Application can feel unfamiliar", "Win with a simple eligibility check and trusted community referrals."],
      ],
      trustFactors: ["learner safeguarding", "mentor credibility", "no-fee access", "eligibility clarity", "learning support", "transparent outcome boundaries"],
      commonOffers: ["free digital-skills cohort", "learner orientation", "mentor volunteering", "community partnership"],
      shootablePostIdeas: [
        ["Eligibility and application", "Show who the free cohort is for, the dates, and each application step.", "Clear eligibility brings suitable applications."],
        ["Mentor introduction", "Record a mentor introducing the digital skill they support.", "Mentor credibility makes the learning environment easier to trust."],
        ["Safeguarding process", "Create an explainer about learner safeguarding and the support or reporting route.", "Safeguarding proof is a core trust factor."],
        ["Learning activity", "Show a privacy-safe mentor-led learning activity or sample exercise.", "Real learning proof clarifies what the cohort provides."],
        ["Ways to support", "Create a post showing how to refer a learner, volunteer, or discuss partnership.", "Distinct actions turn awareness into useful support."],
      ],
      recommendedCTAs: ["Apply for the free digital-skills cohort", "Check learner eligibility", "Refer an eligible learner", "Volunteer as a mentor", "Ask about partnership", "Read the safeguarding information"],
      captionRules: ["State eligibility, no-fee access, safeguarding, and the exact application or supporter action without employment promises."],
      messageTemplateRules: ["Ask whether the person wants to apply, refer, volunteer, or partner, then share the relevant eligibility and safeguarding step."],
      brandStyleRules: ["Use respectful learner stories, mentor proof, safeguarding clarity, no-fee language, and transparent outcome boundaries."],
      bannedTerms: ["guaranteed job", "job guarantee", "placement guaranteed", "guaranteed salary"],
    },
  },
};

function detectBriefSubtype(profile = {}, rawBiz = {}) {
  const industry = lower([
    rawBiz.biz_industry,
    rawBiz.biz_type,
    rawBiz.biz_customer_model,
    profile.market?.industry,
    profile.identity?.type,
    profile.customers?.model,
  ].filter(Boolean).join(" "), "");
  const brief = lower([
    rawBiz.biz_offer,
    rawBiz.biz_extra,
    rawBiz.biz_audience,
    rawBiz.biz_usp,
    profile.offering?.coreOffer,
    profile.customers?.audience,
  ].filter(Boolean).join(" "), "");

  const submittedText = `${industry} ${brief}`;
  const ecommerceContext = /\b(?:e-?commerce|d2c|online store|online shop|online only)\b/.test(industry);
  const skincareEvidence = /\b(?:skin[ -]?care|sunscreen|spf(?:\s*\d+)?)\b/.test(submittedText);
  if (ecommerceContext && skincareEvidence) return "d2c_skincare";

  const healthcareContext = /\b(?:healthcare|health care|clinic|wellness|physiotherapy|physio)\b/.test(industry);
  const physiotherapyEvidence = /\b(?:physiotherapy|physiotherapist|physio)\b/.test(submittedText);
  if (healthcareContext && physiotherapyEvidence) return "physiotherapy";

  const solarContext = /\b(?:manufacturing|manufacturer|business supply|b2b supply|contractor|consulting|consultant|professional service|solar installation)\b/.test(industry);
  const solarEvidence = /\bsolar\b/.test(submittedText)
    && /\b(?:installation|installer|rooftop|panel|panels|epc|discom|net[- ]metering|system design|commercial project|commercial projects)\b/.test(submittedText);
  if (solarContext && solarEvidence) return "b2b_solar";

  const educationContext = /\b(?:education|coaching|school|academy|learning|literacy)\b/.test(industry);
  const nonprofitEvidence = /\b(?:nonprofit|non-profit|not-for-profit|ngo|charitable)\b/.test(submittedText);
  if (educationContext && nonprofitEvidence) return "nonprofit_education";
  return "";
}

function detectBusinessType(profile = {}, rawBiz = {}, briefSubtype = "") {
  if (briefSubtype && BRIEF_SUBTYPE_CONFIG[briefSubtype]) return BRIEF_SUBTYPE_CONFIG[briefSubtype].businessType;
  const text = lower([
    rawBiz.biz_industry,
    rawBiz.biz_type,
    rawBiz.biz_offer,
    rawBiz.biz_extra,
    profile.market?.industry,
    profile.identity?.type,
    profile.offering?.coreOffer,
  ].filter(Boolean).join(" "), "");

  const aliases = [
    [/restaurant|dine|meal|kitchen|food truck|catering|cloud kitchen|tiffin/, "restaurant"],
    [/cafe|coffee|tea shop|juice bar/, "cafe"],
    [/bakery|cake|bake|sweets/, "bakery"],
    [/salon|beauty|hair|makeup|nail/, "salon"],
    [/barber|grooming/, "barber shop"],
    [/spa|massage|wellness treatment/, "spa"],
    [/gym|fitness studio|workout/, "gym"],
    [/fitness coach|personal trainer|yoga coach/, "fitness coach"],
    [/dental|dentist/, "dental clinic"],
    [/clinic|doctor|physician|diagnostic|healthcare/, "clinic"],
    [/tuition|coaching center|coaching centre|exam class|study centre|study center/, "tuition center"],
    [/preschool|playschool|kindergarten|daycare/, "preschool"],
    // Sits AFTER the gym and fitness-coach aliases on purpose, so "personal
    // trainer" is still a trainer. Everything left saying "training" here is
    // somebody teaching a skill.
    [/\btraining\b|\beducation\b|academy|institute|upskill|edtech|\bcourses?\b/, "training centre"],
    [/boutique/, "boutique"],
    [/clothing|fashion|apparel|garment/, "clothing store"],
    [/mobile repair|phone repair|smartphone repair/, "mobile repair shop"],
    [/electronics|mobile store|gadget shop/, "electronics shop"],
    [/car wash|detailing/, "car wash"],
    [/cleaning|laundry|housekeeping/, "cleaning service"],
    [/real estate|property|broker/, "real estate agent"],
    [/photograph|videograph/, "photographer"],
    [/event planner|wedding planner|event management/, "event planner"],
    [/interior|architecture|home decor service/, "interior designer"],
    [/digital marketing agency|marketing agency/, "digital marketing agency"],
    [/web design|website agency/, "web design agency"],
    [/freelancer/, "freelancer"],
    [/consultant|consulting|advisor/, "consultant"],
    [/e-commerce|ecommerce|d2c|online store|online clothing|shopify/, "ecommerce brand"],
    [/saas|software|micro[-\s]?saas|\bapp\b|ai tool|developer tool|subscription app/, "SaaS product"],
    [/creator|influencer|newsletter|youtube|personal brand/, "creator"],
  ];

  const match = aliases.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  if (/shop|store|retail|gift|stationery|jewellery|accessories/.test(text)) return "local retail business";
  if (/service|repair|maintenance|technician|home visit/.test(text)) return "local service business";
  // Was /professional/ on its own, which caught the industry "Professional
  // Training / Education" and called a tuition centre a professional service.
  if (/agency|legal|accounting|\bca\b|professional service|consulting/.test(text)) return "professional service";
  return clean(rawBiz.biz_industry || profile.market?.industry, "local business");
}

function detectParentCategory(businessType, profile = {}, rawBiz = {}, briefSubtype = "") {
  if (briefSubtype && BRIEF_SUBTYPE_CONFIG[briefSubtype]) return BRIEF_SUBTYPE_CONFIG[briefSubtype].parentCategory;
  const text = lower([businessType, rawBiz.biz_industry, rawBiz.biz_type, rawBiz.biz_offer, profile.market?.industry].join(" "), "");
  if (/\b(restaurant|cafe|bakery|food|meal|kitchen|catering|coffee|tea|juice)\b/.test(text)) return "food_beverage";
  if (/tuition|preschool|school|coaching|education|teacher|class|admission/.test(text)) return "education";
  if (/salon|barber|spa|gym|fitness coach|personal trainer|yoga coach|beauty|hair|makeup|nail|grooming/.test(text)) return "appointment_service";
  if (/dental|clinic|doctor|healthcare|diagnostic|physician/.test(text)) return "healthcare";
  if (/mobile repair|phone repair|cleaning|laundry|car wash|repair|maintenance|technician|local service/.test(text)) return "local_service";
  if (/real estate|photograph|event|interior|agency|freelancer|consultant|professional service|web design|marketing agency/.test(text)) return "professional_service";
  if (/e-commerce|ecommerce|d2c|online store|shopify/.test(text)) return "ecommerce";
  if (/saas|software|\bapp\b|ai tool|developer tool|subscription/.test(text)) return "software";
  if (/creator|personal brand|newsletter|youtube|influencer/.test(text)) return "creator_personal_brand";
  if (/boutique|clothing|fashion|electronics|retail|shop|store|gift|jewellery|accessories|stock/.test(text)) return "retail";
  return "local_service";
}

function detectStage(profile = {}, rawBiz = {}) {
  const text = lower([
    rawBiz.biz_stage,
    rawBiz.biz_age,
    rawBiz.biz_extra,
    profile.identity?.stage,
    profile.identity?.age,
  ].filter(Boolean).join(" "), "");
  if (/not launched|pre[-\s]?launch|before launch|idea|validation|opening soon|launching soon|not started/.test(text)) return "pre_launch";
  if (/just opened|just launched|first customers|new business|0-6 months|less than 1 year|startup/.test(text)) return "early";
  if (/established|mature|many years|branch|expanding/.test(text)) return "established";
  return "running";
}

function normalizeGoal(value, contextHint = "") {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = lower(raw, "");
  if (!text) return contextHint === "software" ? "launch_business" : "get_more_whatsapp_messages";
  if (/^(customers|get customers|more customers)$/.test(text)) {
    if (contextHint === "ecommerce") return "get_more_online_orders";
    if (contextHint === "professional_service") return "get_leads";
    return "get_more_walkins";
  }
  if (SUPPORTED_GOALS.includes(text)) return text;
  if (GOAL_ALIASES[text]) return GOAL_ALIASES[text];
  const slug = text.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (SUPPORTED_GOALS.includes(slug)) return slug;
  if (GOAL_ALIASES[slug]) return GOAL_ALIASES[slug];
  if (/book|appointment|slot/.test(text)) return "get_more_bookings";
  if (/whatsapp|dm|message/.test(text)) return "get_more_whatsapp_messages";
  if (/lead|enquir|quote|consult/.test(text)) return "get_leads";
  if (/online|order|cart|shop/.test(text)) return "get_more_online_orders";
  if (/review|google/.test(text)) return "get_google_reviews";
  if (/trust|credib/.test(text)) return "build_trust";
  if (/launch|opening|start/.test(text)) return "launch_business";
  if (/stock|clearance/.test(text)) return "clear_old_stock";
  return "get_more_whatsapp_messages";
}

function normalizePlatforms(rawBiz = {}, parentCategory) {
  const selected = Array.isArray(rawBiz.platforms) ? rawBiz.platforms.filter(item => item && item !== "None yet") : [];
  if (selected.length) return selected;
  if (parentCategory === "software") return ["Website", "LinkedIn", "Instagram"];
  if (parentCategory === "ecommerce") return ["Instagram", "Website", "WhatsApp"];
  if (parentCategory === "healthcare") return ["Google Business", "WhatsApp", "Instagram"];
  return ["Instagram", "WhatsApp", "Google Business"];
}

function inferProductsOrServices(profile = {}, rawBiz = {}, businessType, briefSubtype = "") {
  const explicit = firstUseful(rawBiz.biz_offer, profile.offering?.coreOffer);
  if (explicit) return onePick(explicit);
  if (briefSubtype && BRIEF_SUBTYPE_CONFIG[briefSubtype]) return BRIEF_SUBTYPE_CONFIG[briefSubtype].productsOrServices;
  const fallback = {
    restaurant: "fresh meals and dine-in food",
    cafe: "coffee, snacks, and cafe items",
    bakery: "cakes, snacks, and baked items",
    salon: "hair, beauty, and grooming services",
    "dental clinic": "dental consultation and checkups",
    "tuition center": "tuition classes and demo classes",
    boutique: "clothing, outfits, and accessories",
    "mobile repair shop": "phone repair and service",
    "cleaning service": "home and office cleaning",
    "real estate agent": "property buying, selling, and rental help",
    "ecommerce brand": "online clothing and products",
    "SaaS product": "software subscription and product demo",
  };
  return fallback[businessType] || "products and services";
}

function inferAudience(profile = {}, rawBiz = {}, businessType, parentCategory) {
  const explicit = firstUseful(rawBiz.biz_audience, profile.customers?.audience);
  if (explicit) return onePick(explicit);
  if (businessType === "restaurant" || businessType === "cafe") return "nearby families, students, and office customers";
  if (businessType === "salon") return "local customers planning grooming, events, or regular care";
  if (businessType === "dental clinic") return "families and adults who want safe dental care";
  if (businessType === "tuition center") return "parents and students";
  if (businessType === "boutique" || parentCategory === "retail") return "style-conscious local shoppers";
  if (businessType === "mobile repair shop") return "people who need phone repair quickly and safely";
  if (businessType === "cleaning service") return "homes and offices that need reliable cleaning";
  if (businessType === "real estate agent") return "property buyers, sellers, and tenants";
  if (parentCategory === "software") return "small business owners and busy teams";
  return "local customers";
}

function getBestCustomerAction(goalStrategy, pack, parentCategory) {
  return pack.primaryCTA || goalStrategy.bestCustomerAction?.[parentCategory] || pack.recommendedCTAs[0] || "Message for the next step";
}

function getGoalStrategy(goal) {
  return GOAL_STRATEGIES[goal] || GOAL_STRATEGIES.get_more_whatsapp_messages;
}

function getIndustryPack(contextOrCategory) {
  const category = typeof contextOrCategory === "string" ? contextOrCategory : contextOrCategory?.parentCategory;
  return INDUSTRY_PACKS[category] || INDUSTRY_PACKS.local_service;
}

function replaceInValue(value, replacements) {
  if (Array.isArray(value)) return value.map(item => replaceInValue(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceInValue(child, replacements)]));
  }
  if (typeof value !== "string") return value;
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function adaptIndustryPackForContext(pack, context) {
  let adapted = JSON.parse(JSON.stringify(pack));
  const businessText = lower(`${context.businessType} ${context.productsOrServices}`);

  const subtypeConfig = BRIEF_SUBTYPE_CONFIG[context.briefSubtype];
  if (subtypeConfig) {
    adapted = {
      ...adapted,
      ...JSON.parse(JSON.stringify(subtypeConfig.pack)),
      primaryCTA: subtypeConfig.primaryCTA,
    };
  }

  if (/cleaning|laundry|housekeeping/.test(businessText)) {
    adapted = replaceInValue(adapted, [
      [/\btechnician\b/gi, "cleaning team"],
      [/\btechnicians\b/gi, "cleaning staff"],
      [/\brepair\b/gi, "service"],
      [/\bfixed\b/gi, "cleaned"],
      [/\bphone\b/gi, "space"],
    ]);
    adapted.vocabulary = unique(["cleaning team", "cleaning staff", "deep cleaning", "before and after", "booking", "service area", "estimate", "home", "office", ...adapted.vocabulary.filter(word => !/technician|repair/i.test(word))]);
    adapted.trustFactors = unique(["trained cleaning staff", "before-and-after proof", "clear estimate", "area coverage", "timing", ...adapted.trustFactors.filter(word => !/technician|repair/i.test(word))]);
  }

  if (/real estate|property|broker|agent/.test(businessText)) {
    adapted.recommendedCTAs = [
      "Send your budget and preferred area",
      "Book a site visit",
      "Ask for available properties",
      "WhatsApp your property need",
      "Schedule a quick call",
    ];
    adapted.vocabulary = unique(["property", "site visit", "preferred area", "budget", "available properties", "buyer", "tenant", "owner", ...adapted.vocabulary]);
    adapted.customerProblems = [
      makeProblem("They do not know which property fits their budget.", "Real estate leads need area, budget, and property type clarity before a useful reply.", "Ask for budget, preferred area, and property type first.", "Send your budget and preferred area. We will share suitable available properties.", "Create a post showing how to send a clear property enquiry."),
      makeProblem("They worry the property details may be incomplete.", "People want location, price range, photos, and visit timing before trusting a listing.", "Show real listing details and the site visit process.", "Ask for available properties and book a site visit only after checking the basics.", "Show one listing format with area, budget, photos, and visit step."),
      makeProblem("They do not want random property calls.", "Serious buyers and tenants want filtered options.", "Explain how you shortlist properties.", "Tell us your preferred area, budget, and must-have details. We will avoid random options.", "Record a simple property shortlisting checklist."),
      ...adapted.customerProblems.slice(0, 2),
    ];
  }

  return adapted;
}

// The single field that separates two businesses in the SAME industry. Two
// London dental clinics differ by "same-week appointments" vs "evening slots
// after work" - nothing else in the brief distinguishes them. Before this,
// biz_usp was only read to pick a subtype and then thrown away, so both
// clinics received a word-for-word identical plan.
function extractDifferentiator(profile = {}, rawBiz = {}) {
  const raw = clean(
    profile.offering?.usp
      || rawBiz.biz_usp
      || rawBiz.usp
      || rawBiz.biz_offer_details
      || rawBiz.biz_extra,
    ""
  );
  // Placeholders the intake form and older payloads send when nothing was typed.
  if (!raw || /^(any|n\/?a|none|na|-|nil|no)$/i.test(raw)) return "";
  // A multi-tick answer arrives as "A | B | C". One pick belongs inside a
  // sentence; the whole list stays with the diagnostic, which is right to call
  // out somebody who ticked everything.
  const phrase = onePick(raw.replace(/\s+/g, " ").trim().replace(/[.;]+$/, ""));
  // Keep it short enough to read inside a sentence, but never cut mid-word.
  if (phrase.length <= 90) return phrase;
  return `${phrase.slice(0, 90).replace(/\s+\S*$/, "")}`;
}

// Every card in a tab used to declare the same two metric sentences, so the
// "what to track" column read as one line copied twenty times. The pack already
// lists five real numbers - rotate a pair per card instead.
function trackForIndex(metrics, index) {
  const numbers = unique((metrics.numbers || []).map(item => clean(item)).filter(Boolean));
  if (numbers.length < 2) return metrics.track;
  const first = numbers[index % numbers.length];
  const second = numbers[(index + 1) % numbers.length];
  return `${first} first, then ${lower(second)} in the same week.`;
}

export function normalizeBusinessContext(profile = {}, rawBiz = {}) {
  const businessName = clean(profile.identity?.name || rawBiz.biz_name || rawBiz.name, "Your Business");
  const briefSubtype = detectBriefSubtype(profile, rawBiz);
  const subtypeConfig = BRIEF_SUBTYPE_CONFIG[briefSubtype];
  const businessType = detectBusinessType(profile, rawBiz, briefSubtype);
  const parentCategory = detectParentCategory(businessType, profile, rawBiz, briefSubtype);
  const selectedGoal = normalizeGoal(rawBiz.goal || profile.objectives?.goals, parentCategory);
  const pack = getIndustryPack(parentCategory);
  const goalStrategy = getGoalStrategy(selectedGoal);
  const location = clean(profile.market?.location || rawBiz.biz_location || rawBiz.location, parentCategory === "software" ? "online market" : "your area");
  const city = location.split(",")[0].trim() || location;
  const context = {
    businessName,
    businessType,
    parentCategory,
    briefSubtype,
    briefText: clean([
      rawBiz.biz_offer,
      rawBiz.biz_extra,
      rawBiz.biz_audience,
      rawBiz.biz_usp,
      rawBiz.biz_challenge,
    ].filter(Boolean).join(" ")),
    differentiator: extractDifferentiator(profile, rawBiz),
    launchStage: detectStage(profile, rawBiz),
    location,
    city,
    selectedGoal,
    audience: inferAudience(profile, rawBiz, businessType, parentCategory),
    productsOrServices: inferProductsOrServices(profile, rawBiz, businessType, briefSubtype),
    salesChannel: "",
    customerAction: "",
    trustNeeds: subtypeConfig?.pack?.trustFactors || pack.trustFactors,
    offerAvailable: selectedGoal === "promote_offer" || selectedGoal === "clear_old_stock" || Boolean(clean(rawBiz.biz_offer_details)),
    platforms: normalizePlatforms(rawBiz, parentCategory),
    tone: onePick(clean(rawBiz.biz_personality || profile.brand?.personality, ""), "simple, warm, direct, practical"),
    // The multi-tick answers kept whole, so generated copy can be checked
    // against what the form actually sent. See multiPick.js.
    pickLists: [
      rawBiz.biz_usp,
      rawBiz.biz_audience,
      rawBiz.biz_offer,
      rawBiz.biz_personality,
      rawBiz.biz_challenge,
      rawBiz.biz_customer_model,
    ].filter(Boolean),
  };
  context.customerAction = subtypeConfig?.primaryCTA || getBestCustomerAction(goalStrategy, pack, parentCategory);
  context.salesChannel = context.platforms.join(", ");
  return context;
}

function buildHashtags(context, pack) {
  const city = context.city.replace(/[^a-z0-9]/gi, "");
  const type = context.businessType.replace(/[^a-z0-9\s]/gi, " ").split(/\s+/).filter(Boolean).slice(0, 3);
  const vocab = pack.vocabulary.slice(0, 4).map(word => word.replace(/[^a-z0-9]/gi, ""));
  return unique([
    city && `#${city}`,
    city && `#${city}Business`,
    ...type.map(word => city ? `#${city}${word[0].toUpperCase()}${word.slice(1)}` : `#${word}`),
    ...vocab.map(word => word && `#${word}`),
    "#smallbusinessindia",
    "#supportlocal",
  ]).slice(0, 14);
}

function actionForDay(context, pack, goalStrategy, index) {
  const goalAction = getBestCustomerAction(goalStrategy, pack, context.parentCategory);
  const ctas = unique([goalAction, ...pack.recommendedCTAs]);
  return ctas[index % ctas.length] || context.customerAction;
}

function metricsForContext(context) {
  if (context.briefSubtype === "nonprofit_education") {
    return {
      track: "Eligible applications, learner referrals, volunteer interest, partnership enquiries, and safeguarding questions.",
      expected: "More eligible applications, useful referrals, volunteer interest, and partnership conversations.",
      numbers: ["Eligible applications", "Learner referrals", "Volunteer interest", "Partnership enquiries", "Safeguarding questions"],
      weekly: ["Eligible applications", "Learner referrals", "Volunteer interest", "Partnership enquiries", "Repeated eligibility questions"],
      resultSource: "eligible applications, referral messages, volunteer interest, partnership conversations, and consented learning evidence",
      firstProofTitle: "Make learner trust visible",
      firstProofAction: "Show eligibility, no-fee access, mentor credibility, safeguarding, and privacy-safe learning evidence clearly.",
      firstProofCopy: `${context.businessName} applicants can check eligibility and safeguarding before applying.`,
    };
  }
  if (context.parentCategory === "software") {
    return {
      track: "Demo requests, signups, trial starts, qualified replies, saves, and repeated questions.",
      expected: "More demo requests, signups, trial starts, qualified replies, and saved posts.",
      numbers: ["Demo requests", "Trial starts", "Qualified replies", "Activation questions", "Saved posts"],
      weekly: ["Demo requests", "Trial starts", "Qualified leads", "Activation questions", "Repeated objections"],
      resultSource: "real demo, trial, support, and customer proof",
      firstProofTitle: "Make product proof visible",
      firstProofAction: "Use demo screens, setup proof, customer logos, reviews, and support clarity so buyers know the product is real.",
      firstProofCopy: `${context.businessName} buyers can ask for a short demo before starting.`,
    };
  }
  return {
    track: "Messages, saves, calls, bookings, orders, and useful questions.",
    expected: "More useful messages, visits, bookings, orders, reviews, or saved posts.",
    numbers: ["Useful messages", "Bookings or orders", "Profile visits", "Google reviews", "Repeated questions"],
    weekly: ["Useful messages", "Bookings or orders", "Profile visits", "Reviews", "Repeated questions"],
    resultSource: "photos, reviews, messages, and before-after/process clips from every real job or order",
    firstProofTitle: "Make local trust visible",
    firstProofAction: `Use ${context.city}, nearby landmarks, real photos, reviews, and process clips so people know the business is reachable.`,
    firstProofCopy: `${context.city} customers can message ${context.businessName} to check ${context.productsOrServices}.`,
  };
}

function platformForDay(context, index) {
  const platforms = context.platforms.length ? context.platforms : ["Instagram", "WhatsApp", "Google Business"];
  if (index % 7 === 5 && platforms.includes("Google Business")) return "Google Business";
  if (index % 5 === 4 && platforms.includes("WhatsApp")) return "WhatsApp";
  return platforms[index % platforms.length];
}

function postTypeForDay(parentCategory, index) {
  const types = parentCategory === "software"
    ? ["Screen demo", "Carousel", "Founder note", "Case example", "FAQ post", "Short video"]
    : ["Reel", "Carousel", "Story", "Photo post", "WhatsApp status", "Google post"];
  return types[index % types.length];
}

function phaseForDay(goalStrategy, index) {
  return goalStrategy.calendarFlow[index % goalStrategy.calendarFlow.length];
}

function buildCaption(context, idea, action, index) {
  const intros = context.launchStage === "pre_launch" && context.selectedGoal === "launch_business"
    ? [
        `${context.businessName} is preparing ${context.productsOrServices} for ${context.audience} in ${context.city}.`,
        `Before launch, ${context.businessName} is showing the details people should see first.`,
        `${context.city} customers should know exactly what ${context.businessName} will offer before opening.`,
      ]
    : [
        `${context.businessName} helps ${context.audience} with ${context.productsOrServices}.`,
        `If you are comparing ${context.businessType} options in ${context.city}, start with the details that matter.`,
        `${context.businessName} is making ${context.productsOrServices} easier to understand before people take action.`,
      ];
  const detailOptions = [
    `Today's post should show ${idea[0].toLowerCase()} in a way customers can actually judge.`,
    `The goal is to make ${context.customerAction.toLowerCase()} feel simple and safe.`,
    `This answers one real customer doubt before they have to ask.`,
    `Use this post to show proof, not just a nice-looking update.`,
  ];
  const suffixes = [
    action,
    `${action} today`,
    `${action} when you are ready`,
    `${action} before you decide`,
  ];
  const intro = intros[index % intros.length];
  const detail = detailOptions[index % detailOptions.length];
  return `${intro} ${detail} ${suffixes[index % suffixes.length]}.`;
}

function buildCalendar(context, pack, goalStrategy, hashtags) {
  const usedTitles = new Set();
  return Array.from({ length: 30 }, (_, index) => {
    const idea = pack.shootablePostIdeas[index % pack.shootablePostIdeas.length];
    const phase = phaseForDay(goalStrategy, index);
    const day = index + 1;
    const rawTitle = `${phase}: ${idea[0]}`;
    const title = usedTitles.has(rawTitle) ? `${rawTitle} ${Math.floor(index / pack.shootablePostIdeas.length) + 1}` : rawTitle;
    usedTitles.add(rawTitle);
    const action = actionForDay(context, pack, goalStrategy, index);
    const whatToShow = template(idea[1], context);
    const caption = buildCaption(context, idea, action, index);
    const why = template(idea[2], context);
    const postType = postTypeForDay(context.parentCategory, index);

    return {
      day,
      platform: platformForDay(context, index),
      postType,
      post_type: postType,
      title,
      topic: title,
      hook: title,
      goalIntent: phase,
      goal_intent: phase,
      whatToShow,
      what_to_show: whatToShow,
      post: whatToShow,
      caption,
      ready_caption: caption,
      full_caption: `${caption}\n\nNext step: ${action}`,
      customerAction: action,
      customer_action: action,
      whyThisHelps: why,
      why_this_helps: why,
      why_this_works: why,
      hashtags: hashtags.slice(0, 10),
      how_to_create: [
        whatToShow,
        "Keep the first 3 seconds or first line very clear.",
        `End with: ${action}.`,
      ],
    };
  });
}

function buildStrategySteps(context, pack, goalStrategy) {
  const focus = context.briefSubtype
    ? pack.shootablePostIdeas.map(item => item[0])
    : goalStrategy.contentAngles;
  const metrics = metricsForContext(context);
  const firstReplyCopy = (() => {
    if (context.briefSubtype) return buildMessageText(context, pack, 0);
    if (context.parentCategory === "food_beverage") return `Hi, ${context.businessName} is opening with ${context.productsOrServices}. Save the location and message us to check the opening item.`;
    if (context.parentCategory === "appointment_service") return `Hi, tell us the service and date you want. We will share available slots for ${context.businessName}.`;
    if (context.parentCategory === "healthcare") return `Hi, please call or WhatsApp ${context.businessName} for today's appointment timing.`;
    if (context.parentCategory === "education") return `Hi, share the class and subject. ${context.businessName} will send demo class and batch timing.`;
    if (/real estate|property/.test(lower(context.businessType))) return `Hi, send your budget, preferred area, and property type. ${context.businessName} will share suitable options.`;
    if (/cleaning/.test(lower(context.businessType))) return `Hi, send your area, space type, and preferred date. ${context.businessName} will guide the cleaning booking.`;
    if (context.parentCategory === "software") return `Hi, tell us the workflow you want to improve. ${context.businessName} will show the shortest demo.`;
    return `Hi, tell us the option you want from ${context.businessName}. We will share the clearest next step.`;
  })();
  const savedReplyTopics = context.briefSubtype === "nonprofit_education"
    ? "eligibility, cohort dates, safeguarding, learner support, referrals, volunteering, and partnerships"
    : "price, timing, availability, area, proof, and the first step";
  const actions = [
    ["Make the first action visible", `Put "${context.customerAction}" in Instagram bio, WhatsApp greeting, Google profile, and every launch post.`, firstReplyCopy],
    ["Show one real example every day", `Use ${pack.shootablePostIdeas[0][0].toLowerCase()} and ${pack.shootablePostIdeas[1][0].toLowerCase()} so people can see the actual ${context.businessType} offer.`, buildCaption(context, pack.shootablePostIdeas[0], context.customerAction, 0)],
    ["Answer the biggest doubt publicly", `${pack.customerProblems[0].solution}. Turn this into a post, story, and WhatsApp saved reply.`, pack.customerProblems[0].text],
    ["Create a saved reply set", `Prepare replies for ${savedReplyTopics} for ${context.productsOrServices}.`, buildMessageText(context, pack, 0)],
    [metrics.firstProofTitle, metrics.firstProofAction, metrics.firstProofCopy],
    ["Build one simple offer path", `Package ${context.productsOrServices} into one starter option that fits ${context.audience}.`, `Start with this simple option. ${context.customerAction}.`],
    ["Use the best channel for action", `Use ${context.platforms[0]} for discovery and ${context.platforms.includes("WhatsApp") ? "WhatsApp" : context.platforms[0]} for direct questions.`, `Seen something useful? ${context.customerAction}.`],
    ["Track only useful numbers", `Track ${metrics.weekly.join(", ").toLowerCase()}. Ignore empty likes if they do not create action.`, "This week, note which post brought real action."],
    ["Repeat the winning post format", `After 7 days, repeat the post that created the most ${context.customerAction.toLowerCase()} actions.`, "More of what people actually respond to."],
    ["Turn every result into proof", `Save ${metrics.resultSource}.`, "Your next post should come from real work, not guessing."],
  ];

  return actions.map(([title, action, copy], index) => ({
    step: index + 1,
    title,
    why_this_matters: index < 3 ? goalStrategy.purpose : `This uses ${focus[index % focus.length]} for ${context.businessType}.`,
    reason: index < 3 ? goalStrategy.purpose : `This uses ${focus[index % focus.length]} for ${context.businessType}.`,
    steps: [
      action,
      `Use words customers understand: ${pack.vocabulary.slice(0, 4).join(", ")}.`,
      `Check if it creates: ${context.customerAction}.`,
    ],
    action_steps: [
      action,
      `Use words customers understand: ${pack.vocabulary.slice(0, 4).join(", ")}.`,
      `Check if it creates: ${context.customerAction}.`,
    ],
    example_for_this_business: `${context.businessName} can use this for ${context.productsOrServices} in ${context.city}.`,
    copy_ready_text: copy,
    track_this: trackForIndex(metrics, index),
    what_to_check: trackForIndex(metrics, index),
    priority: index < 3 ? "Do this first" : index < 7 ? "Do this this week" : "Do after the basics",
    effort: index < 6 ? "Simple task" : "Needs weekly discipline",
    timeline: index < 3 ? "Today" : index < 7 ? "This week" : "This month",
  }));
}

function buildPsychology(context, pack) {
  return pack.customerProblems.slice(0, 6).map((item, index) => ({
    customer_thought: item.problem,
    what_it_means: item.why,
    what_to_show: template(pack.shootablePostIdeas[index % pack.shootablePostIdeas.length][1], context),
    what_to_say: template(item.text, context),
    why_this_works: `${pack.trustFactors[index % pack.trustFactors.length]} matters before people take action.`,
  }));
}

function buildPersonas(context, pack) {
  return pack.customerTypes.slice(0, 4).map((type, index) => ({
    label: type,
    note: "Example based on the business details.",
    who_they_are: `${type} in ${context.city} who may need ${context.productsOrServices}.`,
    what_they_want: `A clear, safe way to decide if ${context.businessName} fits them.`,
    what_may_stop_them: pack.customerProblems[index % pack.customerProblems.length].problem,
    how_to_convince_them: pack.customerProblems[index % pack.customerProblems.length].solution,
    message_to_use: template(pack.customerProblems[index % pack.customerProblems.length].text, context),
    best_channel: context.platforms[index % context.platforms.length],
  }));
}

function buildCustomerProblems(context, pack) {
  return pack.customerProblems.map((item, index) => ({
    problem: item.problem,
    customer_problem: item.problem,
    why_they_feel_this: item.why,
    your_solution: item.solution,
    text_to_use: template(item.text, context),
    content_idea: template(item.contentIdea, context),
    what_to_do: item.solution,
    what_to_say: template(item.text, context),
    post_idea: template(item.contentIdea, context),
    trust_factor: pack.trustFactors[index % pack.trustFactors.length],
  }));
}

function buildCompetitors(context, pack) {
  return {
    basis: "Common choices a customer may compare before deciding.",
    archetypes: pack.competitorAlternatives.map(([label, strength, win]) => ({
      label,
      basis: "Market pattern",
      strengths: [strength],
      weaknesses: ["May not explain the next step clearly enough."],
      how_to_beat_them: template(win, context),
      message_to_use: `${context.businessName} should show ${pack.trustFactors.slice(0, 3).join(", ")} more clearly than this option.`,
    })),
    platform_plan: [
      { platform: context.platforms[0] || "Instagram", move: `Show ${pack.shootablePostIdeas[0][0].toLowerCase()} and ask people to ${context.customerAction.toLowerCase()}.` },
      { platform: context.platforms.includes("WhatsApp") ? "WhatsApp" : context.platforms[1] || "WhatsApp", move: `Use saved replies for ${pack.customerProblems.map(item => item.problem.toLowerCase()).slice(0, 3).join(", ")}.` },
      { platform: context.platforms.includes("Google Business") ? "Google Business" : "Search", move: `Keep location, timing, reviews, and photos updated for ${context.city}.` },
    ],
  };
}

function buildIdeas(context, pack, goalStrategy) {
  const metrics = metricsForContext(context);
  const base = [
    ...pack.shootablePostIdeas.map((idea, index) => [idea[0], idea[1], idea[2], actionForDay(context, pack, goalStrategy, index)]),
    ...pack.customerProblems.map((problem, index) => [problem.problem, problem.contentIdea, problem.solution, actionForDay(context, pack, goalStrategy, index + 5)]),
    ...goalStrategy.advancedGrowthActions.map((action, index) => [action, `Create one small test around ${action.toLowerCase()} for ${context.businessName}.`, goalStrategy.purpose, actionForDay(context, pack, goalStrategy, index + 10)]),
    ["Google profile cleanup", `Add photos, timing, service/product list, and the best WhatsApp number for ${context.businessName}.`, "Search trust improves when public details are complete.", "Save the profile"],
    ["One-page enquiry tracker", "Write every message source, customer question, and final result in one sheet.", "The owner learns what actually creates action.", "Review this weekly"],
    ["Warm lead follow-up", `Message people who asked about ${context.productsOrServices} but did not act.`, "Many people need a simple reminder.", context.customerAction],
    ["Local collaboration", `Partner with one nearby non-competing business or creator in ${context.city}.`, "Borrowed local trust helps without high budget.", "Suggest a local partner"],
  ];

  let fillerIndex = 0;
  while (base.length < 20) {
    const idea = pack.shootablePostIdeas[fillerIndex % pack.shootablePostIdeas.length];
    const round = Math.floor(fillerIndex / pack.shootablePostIdeas.length) + 2;
    base.push([
      `Week ${round}: ${idea[0]}`,
      `Create another version of this idea for ${context.businessName}: ${idea[1]}`,
      idea[2],
      actionForDay(context, pack, goalStrategy, fillerIndex + 12),
    ]);
    fillerIndex += 1;
  }

  return base.slice(0, 20).map(([title, whatToDo, why, action], index) => ({
    idea: index + 1,
    title,
    idea_title: title,
    opportunity: title,
    where_to_post: context.platforms[index % context.platforms.length],
    what_to_do: template(whatToDo, context),
    what_to_show: template(whatToDo, context),
    why_it_can_work: template(why, context),
    expected_help: metrics.expected,
    customer_action: action,
    track_this: `${action}, plus real replies and saved posts.`,
    what_to_check: `${action}, plus real replies and saved posts.`,
    difficulty: index < 8 ? "Easy" : index < 15 ? "Medium" : "Needs patience",
    cost: index % 4 === 0 ? "Low cost" : "Mostly time",
    when_to_try: index < 6 ? "This week" : "This month",
    how_to_try: [template(whatToDo, context), `End with ${action}.`],
  }));
}

function buildCaptionBank(context, pack, goalStrategy) {
  return pack.shootablePostIdeas.concat(pack.customerProblems.map(item => [item.problem, item.contentIdea, item.why])).slice(0, 10).map((idea, index) => {
    const action = actionForDay(context, pack, goalStrategy, index);
    return buildCaption(context, idea, action, index);
  });
}

function buildMessageText(context, pack, index) {
  const subtypeTemplates = {
    d2c_skincare: [
      "Hi, can you share the sunscreen formula and ingredient details?",
      "Hi, how long will sunscreen delivery take to {{location}}?",
      "Hi, can you share the returns information before I order?",
    ],
    physiotherapy: [
      "Hi, I want to book a physiotherapy assessment. What timing is available?",
      "Hi, can you explain what the first mobility assessment includes?",
      "Hi, can I review the physiotherapist credentials and recovery-plan process?",
    ],
    b2b_solar: [
      "Hi, I want to request a rooftop solar site survey for our facility.",
      "Hi, can I send an electricity bill for a generation and ROI proposal?",
      "Hi, can you share EPC credentials, approval steps, safety controls, and warranty terms?",
    ],
    nonprofit_education: [
      "Hi, I want to check eligibility and apply for the free digital-skills cohort.",
      "Hi, I want to refer an eligible learner. What information should I share?",
      "Hi, I want to volunteer as a mentor or discuss partnership. What is the next step?",
    ],
  };
  const subtypeList = subtypeTemplates[context.briefSubtype];
  if (subtypeList) return template(subtypeList[index % subtypeList.length], context);
  const categoryTemplates = {
    food_beverage: [
      "Hi, is today's special available for takeaway?",
      "Hi, can I see the menu and price?",
      "Hi, do you deliver to {{location}}?",
    ],
    appointment_service: [
      "Hi, do you have a slot available this weekend for {{offer}}?",
      "Hi, can you send the price list?",
      "Hi, I want to book an appointment for {{customerAction}}.",
    ],
    healthcare: [
      "Hi, what are the consultation timings today?",
      "Hi, can I book an appointment with the doctor?",
      "Hi, is prior booking needed?",
    ],
    education: [
      "Hi, can I book a demo class?",
      "Hi, can you share batch timing and fees?",
      "Hi, my child needs help with one subject. Can you guide us?",
    ],
    retail: [
      "Hi, is this available in size {{size}}?",
      "Hi, can you send more photos of this item?",
      "Hi, do you deliver to {{location}}?",
    ],
    local_service: [
      "Hi, I need help with {{offer}}. Can I send a photo?",
      "Hi, do you serve {{location}}?",
      "Hi, what timing is available today?",
    ],
    professional_service: [
      "Hi, I want help with {{offer}}. Can you share your packages or process?",
      "Hi, can we schedule a quick call?",
      "Hi, can you share examples of your previous work?",
    ],
    ecommerce: [
      "Hi, is this available in my size?",
      "Hi, can you help me choose the right size?",
      "Hi, how many days will delivery take to {{location}}?",
    ],
    software: [
      "Hi, can I watch a short demo?",
      "Hi, can this help with my current workflow?",
      "Hi, can I start with one trial workflow?",
    ],
    creator_personal_brand: [
      "Hi, I want help with this topic. Can you guide the next step?",
      "Hi, how do I join your session or newsletter?",
      "Hi, can I ask one question before booking?",
    ],
  };
  const list = categoryTemplates[context.parentCategory] || categoryTemplates.local_service;
  return template(list[index % list.length].replace("{{size}}", "my size"), context);
}

function buildTemplates(context, pack) {
  const subtypeTypes = {
    d2c_skincare: ["Product details reply", "Delivery reply", "Returns reply"],
    physiotherapy: ["Assessment reply", "Mobility assessment reply", "Credentials reply"],
    b2b_solar: ["Site survey reply", "Electricity-bill reply", "Credentials and approvals reply"],
    nonprofit_education: ["Application reply", "Learner referral reply", "Volunteer or partner reply"],
  };
  const guardedTypes = subtypeTypes[context.briefSubtype];
  return Array.from({ length: 8 }, (_, index) => ({
    type: guardedTypes
      ? guardedTypes[index % guardedTypes.length]
      : index === 0 ? "First reply" : index === 1 ? "Price or timing reply" : index === 2 ? "Trust reply" : index === 3 ? "Follow-up" : `Saved reply ${index + 1}`,
    channel: context.platforms.includes("WhatsApp") ? "WhatsApp" : "DM / Message",
    template: buildMessageText(context, pack, index),
    why_suggested: index < 3 ? pack.messageTemplateRules[0] : "Saved replies make direct messages faster and clearer.",
  }));
}

function buildBrandKit(context, pack) {
  return {
    brand_voice: context.tone,
    messages_to_repeat: [
      `${context.productsOrServices} for ${context.audience}`,
      `${context.customerAction} is the next step`,
      `${context.city} relevance`,
      ...pack.trustFactors.slice(0, 3),
    ],
    words_to_use: unique([...pack.vocabulary.slice(0, 8), "clear", "real", "simple", "today"]),
    words_to_avoid: [
      "vague agency words",
      "big claims without proof",
      "startup words for local businesses",
      "fake urgency",
      "unclear sales lines",
    ],
    short_bio: `${context.businessName} offers ${context.productsOrServices} for ${context.audience} in ${context.city}. ${context.customerAction}.`,
    simple_offer_line: `${context.productsOrServices} made easy for ${context.audience}.`,
    customer_actions: pack.recommendedCTAs.slice(0, 6),
    visual_rules: pack.brandStyleRules,
  };
}

function buildPremiumGrowth(context, pack, goalStrategy) {
  return unique([
    ...goalStrategy.advancedGrowthActions,
    "Create a weekly proof library",
    "Make one saved reply for each repeated question",
    "Ask happy customers for reviews within 24 hours",
    "Review every Sunday what created real action",
    "Test one local partnership",
  ]).slice(0, 10).map((title, index) => ({
    module: index + 1,
    title,
    action: `Apply this to ${context.businessName} using ${pack.vocabulary.slice(0, 3).join(", ")} and ${context.customerAction}.`,
    why: index < goalStrategy.advancedGrowthActions.length ? goalStrategy.purpose : `It creates more useful proof for ${context.businessType}.`,
    timeline: index < 3 ? "This week" : index < 7 ? "This month" : "After the basics work",
    output: "One visible post, saved reply, review, offer, or tracking habit.",
  }));
}

function buildScores(context, pack) {
  const stageBoost = context.launchStage === "pre_launch" ? -8 : context.launchStage === "established" ? 8 : 0;
  const platformScore = Math.min(30, context.platforms.length * 9);
  return [
    { label: "Can people understand you fast?", score: Math.max(25, Math.min(92, 42 + platformScore + stageBoost)), reason: `Based on ${context.businessType}, goal, and clarity of ${context.productsOrServices}.` },
    { label: "Do you show enough trust?", score: Math.max(25, Math.min(92, 38 + pack.trustFactors.length * 6 + stageBoost)), reason: `Important trust signals: ${pack.trustFactors.slice(0, 4).join(", ")}.` },
    { label: "Is the next step clear?", score: Math.max(25, Math.min(94, context.customerAction ? 76 : 35)), reason: `Main action: ${context.customerAction}.` },
    { label: "Is the plan tied to the goal?", score: Math.max(25, Math.min(94, 78)), reason: `The selected goal controls calendar, captions, messages, and growth actions.` },
  ];
}

function buildFullReport(context, pack, goalStrategy, calendar, strategy, personas, templates) {
  const metrics = metricsForContext(context);
  return {
    "Quick Summary": {
      business: context.businessName,
      business_type: context.businessType,
      location: context.location,
      selected_goal: context.selectedGoal,
      simple_read: `${context.businessName} should focus on ${goalStrategy.purpose.toLowerCase()} Use ${context.customerAction.toLowerCase()} as the main action.`,
    },
    "What To Do First": strategy.slice(0, 5).map(step => ({
      title: step.title,
      do_this: step.action_steps,
      copy_ready_text: step.copy_ready_text,
      how_to_know_it_worked: step.track_this,
    })),
    "Top 5 Posts To Try": calendar.slice(0, 5).map(day => ({
      title: `Day ${day.day} - ${day.title}`,
      post_type: day.post_type,
      show: day.how_to_create,
      caption: day.caption,
      customer_action: day.customer_action,
      why_this_helps: day.why_this_helps,
    })),
    "Example Customer Types": personas,
    "Top Customer Worries": pack.customerProblems.map(item => item.problem),
    "Top Messages": templates.slice(0, 5),
    "Numbers To Watch": metrics.numbers,
  };
}

function makeFlatSections(context, pack, goalStrategy, calendar, strategy, ideas, captions, templates, hashtags) {
  return {
    "Business Health Snapshot": {
      diagnosis: `${context.businessName} is a ${context.businessType} in ${context.city}. The selected goal is ${context.selectedGoal.replace(/_/g, " ")}, so the plan focuses on ${goalStrategy.purpose.toLowerCase()}`,
      strongest_asset: `${context.productsOrServices} for ${context.audience}.`,
      biggest_leak: `If people cannot see ${pack.trustFactors.slice(0, 3).join(", ")}, they may delay taking action.`,
      next_priority: `Make ${context.customerAction} clear everywhere.`,
      confidence: "Goal and industry rule-based plan",
    },
    "Business DNA / Profile": {
      business_name: context.businessName,
      industry: context.businessType,
      parent_category: context.parentCategory,
      location: context.location,
      launch_stage: context.launchStage,
      selected_goal: context.selectedGoal,
      offer: context.productsOrServices,
      best_customer: context.audience,
      main_customer_action: context.customerAction,
      trust_needs: context.trustNeeds,
      platforms: context.platforms,
    },
    "Customer Psychology": {
      core_truth: `${context.audience} act when they can see ${pack.trustFactors.slice(0, 3).join(", ")} and know the next step.`,
      buying_trigger: goalStrategy.purpose,
      customer_worries: pack.customerProblems.map(item => item.problem),
      questions: pack.customerProblems.map(item => template(item.text, context)),
    },
    "Competitor Intelligence": {
      likely_choices: pack.competitorAlternatives.map(item => item[0]),
      category_gap: `Average ${context.businessType} marketing becomes weak when it hides ${pack.trustFactors.slice(0, 3).join(", ")}.`,
      counter_move: `Show ${pack.shootablePostIdeas[0][0].toLowerCase()} and ask people to ${context.customerAction.toLowerCase()}.`,
    },
    "Positioning Strategy": {
      simple_market_place: `${context.businessName} should be known in ${context.city} for ${context.productsOrServices} that feel clear, trustworthy, and easy to act on.`,
      proof_to_show: pack.trustFactors,
      offer_angle: `${context.productsOrServices} for ${context.audience}, with ${context.customerAction.toLowerCase()} as the next step.`,
      message_rule: "Use one clear visual, one simple sentence, and one customer action.",
    },
    "10-Step Growth Strategy": strategy,
    "30-Day Content Calendar": calendar,
    "20 Growth Experiments": ideas,
    "Caption Bank": captions,
    "Hashtag Generator": hashtags,
    "Implementation Checklist": {
      today: strategy.slice(0, 3).map(step => step.title),
      this_week: strategy.slice(3, 7).map(step => step.title),
      this_month: strategy.slice(7, 10).map(step => step.title),
    },
    "30/60/90-Day Plan": {
      "0-30 days": { focus: goalStrategy.purpose, actions: strategy.slice(0, 4).map(step => step.title), target: context.customerAction },
      "31-60 days": { focus: "Collect proof and repeat what creates action.", actions: strategy.slice(4, 7).map(step => step.title), target: "More serious enquiries and reviews." },
      "61-90 days": { focus: "Turn the winning routine into a weekly system.", actions: strategy.slice(7, 10).map(step => step.title), target: "Less random posting and more repeatable results." },
    },
    "Export / Save": {
      saved_report_ready: true,
      export_formats: ["Print/PDF"],
      report_contract: "Goal and industry controlled marketing plan.",
      generation_source: "marketing_os_rules",
      ai_calls_count: 0,
    },
  };
}

function collectStrings(value, out = []) {
  if (value === undefined || value === null) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    out.push(String(value));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectStrings(item, out));
    return out;
  }
  if (typeof value === "object") {
    Object.values(value).forEach(item => collectStrings(item, out));
  }
  return out;
}

const BRIEF_SEMANTIC_RULES = {
  d2c_skincare: {
    requiredNounGroups: [
      ["sunscreen", "spf", "skincare"],
      ["formula", "ingredient", "mineral", "fragrance-free"],
      ["delivery", "returns", "review"],
    ],
    requiredCtaGroups: [["shop", "add to cart", "order", "checkout"]],
    requiredTrustGroups: [
      ["ingredient", "formula", "spf"],
      ["review", "returns", "delivery", "real application"],
    ],
    forbiddenNouns: ["gift", "gifting", "customise", "customised", "customize", "customized", "customisation", "customization", "occasion"],
    forbiddenCtas: ["book an appointment", "appointment slot", "available slots", "dm to book"],
    forbiddenConstraints: ["guaranteed result", "guaranteed cure", "cures acne", "treats acne", "instant result"],
  },
  physiotherapy: {
    requiredNounGroups: [
      ["physio", "physiotherapist", "physiotherapy"],
      ["assessment", "mobility", "rehab", "rehabilitation", "exercise"],
      ["injury", "recovery", "pain management"],
    ],
    requiredCtaGroups: [["book a physiotherapy assessment", "book an assessment", "schedule a mobility consultation", "appointment"]],
    requiredTrustGroups: [
      ["physiotherapist credentials", "credentials", "qualified physiotherapist"],
      ["assessment", "safety", "recovery", "exercise plan", "progress review"],
    ],
    forbiddenNouns: ["dental", "dentist", "tooth", "teeth", "braces", "implant", "haircut", "facial"],
    forbiddenCtas: ["book a dental", "dental appointment", "book the chair"],
    forbiddenConstraints: ["guaranteed recovery", "guaranteed cure", "instant recovery"],
  },
  b2b_solar: {
    requiredNounGroups: [
      ["solar", "rooftop", "panel"],
      ["energy", "generation", "electricity"],
      ["epc", "discom", "net-meter", "net metering", "approval", "warranty"],
    ],
    requiredCtaGroups: [["site survey", "send an electricity bill", "electricity bill for review", "roi proposal", "request a commercial solar quote"]],
    requiredTrustGroups: [
      ["epc credentials", "credentials", "commercial project references"],
      ["generation estimate", "approval", "warranty", "installation safety"],
    ],
    forbiddenNouns: ["visit charge", "repair photo", "nearby service timing", "same-day repair", "same day repair"],
    forbiddenCtas: ["walk-in", "walk in", "book the service", "call for nearby service timing", "whatsapp a photo of the issue"],
    forbiddenConstraints: ["guaranteed savings", "guaranteed generation", "instant approval"],
  },
  nonprofit_education: {
    requiredNounGroups: [
      ["cohort", "digital skills", "learner"],
      ["mentor", "safeguarding"],
      ["nonprofit", "non-profit", "free", "no fee", "no-fee"],
    ],
    requiredCtaGroups: [["apply", "refer", "volunteer", "partner", "partnership"]],
    requiredTrustGroups: [
      ["mentor", "safeguarding"],
      ["eligibility", "no fee", "no-fee", "free cohort", "learning support"],
    ],
    forbiddenNouns: [
      "hygiene", "grooming", "haircut", "facial", "price list", "demo class",
      "ask for price, proof, and timing", "clear price/package proof", "price framing",
      "booking/order flow", "cross-sell/upsell", "reply with price clarity",
      "booking, order, or visit step", "customer or order is worth",
      "real job or order", "real order numbers",
    ],
    forbiddenCtas: ["appointment slot", "available slots", "dm to book", "book a demo class", "ask for price list"],
    forbiddenConstraints: ["guaranteed job", "job guarantee", "placement guaranteed", "guaranteed placement", "guaranteed salary"],
  },
};

function semanticGeneratedScope(output = {}) {
  const master = output?.master_strategy || (
    output?.content_calendar_30_days || output?.message_templates || output?.customer_pain_points_15
      ? output
      : {}
  );
  return {
    calendar: [
      output?.tabs?.calendar?.days,
      output?.["30-Day Content Calendar"],
      master?.content_calendar_30_days,
    ],
    strategy: [
      output?.tabs?.strategy?.steps,
      output?.["10-Step Growth Strategy"],
      master?.growth_strategy_10_steps,
    ],
    captions: [
      output?.tabs?.captions?.caption_bank,
      output?.["Caption Bank"],
      master?.captions,
    ],
    messages: [
      output?.tabs?.templates?.templates,
      output?.["Message Templates"],
      master?.message_templates,
    ],
    pain_and_proof: [
      output?.tabs?.painPoints?.items,
      master?.customer_pain_points_15,
      output?.["Positioning Strategy"]?.proof_to_show,
      master?.positioning?.proof_to_show,
      master?.messaging?.proof_messages,
    ],
  };
}

function semanticCtaScope(output = {}) {
  const master = output?.master_strategy || (
    output?.content_calendar_30_days || output?.message_templates ? output : {}
  );
  const tabDays = output?.tabs?.calendar?.days || [];
  const flatDays = output?.["30-Day Content Calendar"]?.days || output?.["30-Day Content Calendar"] || [];
  const masterDays = master?.content_calendar_30_days || [];
  const tabTemplates = output?.tabs?.templates?.templates || [];
  const masterTemplates = master?.message_templates || [];
  const tabStrategy = output?.tabs?.strategy?.steps || [];
  const flatStrategy = asArrayForSemantic(output?.["10-Step Growth Strategy"]);
  const masterStrategy = master?.growth_strategy_10_steps || [];
  return [
    ...tabDays.flatMap(day => [day?.customerAction, day?.customer_action, day?.cta, day?.caption]),
    ...asArrayForSemantic(flatDays).flatMap(day => [day?.customerAction, day?.customer_action, day?.cta, day?.caption]),
    ...asArrayForSemantic(masterDays).flatMap(day => [day?.customerAction, day?.customer_action, day?.cta, day?.caption]),
    ...tabStrategy.flatMap(step => [step?.copy_ready_text, step?.example_for_this_business, step?.steps]),
    ...flatStrategy.flatMap(step => [step?.copy_ready_text, step?.example_for_this_business, step?.steps]),
    ...asArrayForSemantic(masterStrategy).flatMap(step => [step?.copy_ready_text, step?.example_for_this_business, step?.steps]),
    ...(output?.tabs?.captions?.caption_bank || []),
    ...asArrayForSemantic(output?.["Caption Bank"]),
    ...(master?.captions || []),
    ...tabTemplates.flatMap(item => [item?.template, item?.message]),
    ...masterTemplates.flatMap(item => [item?.template, item?.message]),
  ];
}

function semanticTrustScope(output = {}) {
  const master = output?.master_strategy || (
    output?.customer_pain_points_15 || output?.positioning || output?.messaging ? output : {}
  );
  const painItems = output?.tabs?.painPoints?.items || [];
  const masterPain = master?.customer_pain_points_15 || [];
  return [
    ...painItems.flatMap(item => [item?.trust_factor, item?.proof, item?.what_to_show, item?.your_solution, item?.content_idea]),
    ...masterPain.flatMap(item => [item?.trust_factor, item?.proof, item?.what_to_show, item?.your_solution, item?.content_idea]),
    ...(output?.["Positioning Strategy"]?.proof_to_show || []),
    ...(master?.positioning?.proof_to_show || []),
    ...(master?.messaging?.proof_messages || []),
  ];
}

function asArrayForSemantic(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.values(value);
}

function semanticTermVariants(term) {
  const normalized = lower(term, "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const last = words[words.length - 1];
  const stems = new Set([last]);
  if (/[^s]s$/.test(last)) stems.add(last.slice(0, -1));
  else {
    stems.add(`${last}s`);
    if (/(?:s|x|z|ch|sh)$/.test(last)) stems.add(`${last}es`);
  }
  return [...stems].map(variant => [...words.slice(0, -1), variant].join(" "));
}

function semanticTermPattern(term, global = false) {
  const alternatives = semanticTermVariants(term)
    .sort((a, b) => b.length - a.length)
    .map(variant => variant
      .split(/[-\s]+/)
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[-\\s]+"));
  if (!alternatives.length) return null;
  return new RegExp(`(^|[^a-z0-9])(${alternatives.join("|")})(?=$|[^a-z0-9])`, global ? "gi" : "i");
}

function matchingTerms(text, terms) {
  const source = lower(text, "");
  return terms.filter(term => semanticTermPattern(term)?.test(source));
}

function missingSemanticGroups(text, groups) {
  return groups.filter(group => matchingAffirmativeTerms(text, group).length === 0);
}

function isNegatedSemanticMatch(source, index) {
  const prefix = source.slice(Math.max(0, index - 100), index);
  const sentencePrefix = prefix.split(/[.!?;:\n]/).pop() || "";
  const cuePattern = /\b(do\s+not|does\s+not|did\s+not|must\s+not|should\s+not|cannot|can['’]?t|won['’]?t|don['’]?t|doesn['’]?t|isn['’]?t|aren['’]?t|never|without|avoid(?:s|ed|ing)?|no|not)\b/gi;
  const cues = [...sentencePrefix.matchAll(cuePattern)];
  const cue = cues[cues.length - 1];
  if (!cue || /\bnot\s+only\b/i.test(sentencePrefix.slice(cue.index))) return false;
  const cueText = lower(cue[1], "");
  const afterCue = sentencePrefix.slice((cue.index || 0) + cue[0].length);
  if (afterCue.length > 90 || /\b(?:but|however|instead|yet)\b/i.test(afterCue)) return false;
  const commaTail = afterCue.slice(afterCue.lastIndexOf(",") + 1).trim();
  const startsPositiveCommand = /^(?:(?:and|then)\s+)?(?:we\s+|it\s+|the\s+\w+\s+)?(?:show|share|state|explain|include|use|post|record|film|display|highlight|publish|teach)\b/i.test(commaTail);
  if (/^(?:no|without)$/.test(cueText) && startsPositiveCommand) return false;
  return true;
}

function matchingAffirmativeTerms(text, terms) {
  const source = lower(text, "");
  return terms.filter(term => {
    const pattern = semanticTermPattern(term, true);
    if (!pattern) return false;
    for (const match of source.matchAll(pattern)) {
      const termIndex = (match.index || 0) + String(match[1] || "").length;
      if (!isNegatedSemanticMatch(source, termIndex)) return true;
    }
    return false;
  });
}

function genericAvoidanceConstraints(brief) {
  const constraints = [];
  const patterns = [
    /\b(?:do\s+not|don['’]?t|dont|never)\s+(?:mention|use|include|show|say|claim|promise|offer|add|recommend|suggest)\s+([^.;,\n]{2,80})/gi,
    /\bavoid(?:ing)?\s+(?:mentioning|using|including|showing|saying|claiming|promising|offering|adding|recommending|suggesting)?\s*([^.;,\n]{2,80})/gi,
    /\bwithout\s+([^.;,\n]{2,80})/gi,
    /\bno[-\s]+((?:discounts?|coupon codes?|giveaways?)(?:\s+(?:and|or)\s+(?:discounts?|coupon codes?|giveaways?))*)\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of brief.matchAll(pattern)) {
      const targets = lower(match[1], "").split(/\s+(?:and|or)\s+/i);
      for (const rawTarget of targets) {
        const target = rawTarget
          .replace(/^(?:any|a|an|the)\s+/, "")
          .replace(/\s+(?:in|on|from)\s+(?:this|the|our|generated)?\s*(?:report|content|copy|captions?|strategy|output).*$/, "")
          .trim()
          .split(/\s+/)
          .slice(0, 6)
          .join(" ");
        if (!target || /^(?:confusion|doubt|problem|issue)$/.test(target)) continue;
        const idPart = target.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
        if (!idPart || constraints.some(item => item.forbiddenTerms[0] === target)) continue;
        constraints.push({
          id: `submitted_avoid_${idPart}`,
          source: match[0].trim(),
          requiredTerms: [],
          forbiddenTerms: [target],
        });
      }
    }
  }
  return constraints;
}

function deriveSubmittedConstraints(businessContext = {}) {
  const brief = lower(businessContext.briefText, "");
  const constraints = genericAvoidanceConstraints(brief);
  if (/no\s+medical\s+claims?|without\s+medical\s+claims?/.test(brief)) {
    constraints.push({
      id: "no_medical_or_cure_claims",
      source: "no medical claims",
      requiredTerms: ["spf", "formula", "ingredient"],
      forbiddenTerms: ["guaranteed cure", "cures acne", "treats acne", "heals acne", "instant result"],
    });
  }
  if (/physio(?:therapy)?|rehab(?:ilitation)?|mobility/.test(brief) && /assessment|safety|recovery/.test(brief)) {
    constraints.push({
      id: "assessment_led_recovery",
      source: "assessment, safety, and recovery evidence",
      requiredTerms: ["assessment", "safety", "recovery"],
      forbiddenTerms: ["guaranteed recovery", "guaranteed cure", "instant recovery"],
    });
  }
  if (/solar|rooftop|\bepc\b/.test(brief) && /generation estimates?|roi proposals?|warrant(?:y|ies)/.test(brief)) {
    constraints.push({
      id: "estimate_not_guarantee",
      source: "generation estimate and ROI proposal",
      requiredTerms: ["generation estimate", "roi proposal", "warranty"],
      forbiddenTerms: ["guaranteed savings", "guaranteed generation", "instant approval"],
    });
  }
  if (/(?:^|\s)free(?:\s|$)|no[-\s]?fees?/.test(brief)) {
    constraints.push({
      id: "no_fee_access",
      source: "free / no fee",
      requiredTerms: ["free", "no fee", "no-fee"],
      forbiddenTerms: ["course fee", "price list", "pay to reserve"],
    });
  }
  if (/no\s+(?:job|placement)\s+guarantee|does\s+not\s+guarantee\s+(?:a\s+)?(?:job|placement)/.test(brief)) {
    constraints.push({
      id: "no_job_or_placement_guarantee",
      source: "no job guarantee",
      requiredTerms: [],
      forbiddenTerms: ["guaranteed job", "job guarantee", "placement guaranteed", "guaranteed placement", "guaranteed salary"],
    });
  }
  return constraints;
}

export function validateSemanticAlignment(output, businessContext = {}) {
  const subtype = businessContext.briefSubtype || "";
  const rules = BRIEF_SEMANTIC_RULES[subtype];
  if (!rules) {
    return {
      passed: true,
      subtype: "",
      issues: [],
      missingNounGroups: [],
      missingCtaGroups: [],
      missingTrustGroups: [],
      forbiddenNounHits: [],
      forbiddenCtaHits: [],
      constraintHits: [],
      submittedConstraintsChecked: [],
      submittedConstraintFailures: [],
    };
  }

  const generatedText = collectStrings(semanticGeneratedScope(output)).join("\n");
  const ctaText = collectStrings(semanticCtaScope(output)).join("\n");
  const trustText = collectStrings(semanticTrustScope(output)).join("\n");
  const missingNounGroups = missingSemanticGroups(generatedText, rules.requiredNounGroups);
  const missingCtaGroups = missingSemanticGroups(ctaText, rules.requiredCtaGroups);
  const missingTrustGroups = missingSemanticGroups(trustText, rules.requiredTrustGroups);
  const forbiddenNounHits = matchingTerms(generatedText, rules.forbiddenNouns);
  const forbiddenCtaHits = matchingTerms(ctaText, rules.forbiddenCtas);
  const submittedConstraintsChecked = deriveSubmittedConstraints(businessContext);
  const submittedConstraintFailures = submittedConstraintsChecked.flatMap(constraint => {
    const hasRequiredTerm = constraint.requiredTerms.length === 0 || matchingAffirmativeTerms(generatedText, constraint.requiredTerms).length > 0;
    const forbiddenHits = matchingAffirmativeTerms(generatedText, constraint.forbiddenTerms);
    return [
      ...(!hasRequiredTerm ? [{ id: constraint.id, kind: "missing_required", terms: constraint.requiredTerms }] : []),
      ...forbiddenHits.map(term => ({ id: constraint.id, kind: "forbidden_claim", term })),
    ];
  });
  const constraintHits = unique([
    ...matchingAffirmativeTerms(generatedText, rules.forbiddenConstraints),
    ...submittedConstraintFailures.filter(item => item.kind === "forbidden_claim").map(item => item.term),
  ]);
  const issues = [
    ...missingNounGroups.map(group => `Brief semantic: missing generated noun group (${group.join(" | ")})`),
    ...missingCtaGroups.map(group => `Brief semantic: missing call to action (${group.join(" | ")})`),
    ...missingTrustGroups.map(group => `Brief semantic: missing trust factor (${group.join(" | ")})`),
    ...forbiddenNounHits.map(term => `Brief semantic: wrong-industry noun (${term})`),
    ...forbiddenCtaHits.map(term => `Brief semantic: wrong call to action (${term})`),
    ...constraintHits.map(term => `Brief semantic: business constraint violated (${term})`),
    ...submittedConstraintFailures
      .filter(item => item.kind === "missing_required")
      .map(item => `Brief semantic: submitted constraint missing required language (${item.id}: ${item.terms.join(" | ")})`),
  ];

  return {
    passed: issues.length === 0,
    subtype,
    issues,
    missingNounGroups,
    missingCtaGroups,
    missingTrustGroups,
    forbiddenNounHits,
    forbiddenCtaHits,
    constraintHits,
    submittedConstraintsChecked,
    submittedConstraintFailures,
  };
}

function textContainsOne(text, terms) {
  const lowerText = lower(text, "");
  return terms.some(term => lowerText.includes(lower(term, "")));
}

function countPhrase(text, phrase) {
  const matches = lower(text, "").match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
  return matches ? matches.length : 0;
}

function captionsFromOutput(output) {
  return [
    ...(output?.tabs?.calendar?.days || []).map(day => day.caption),
    ...(output?.tabs?.captions?.caption_bank || []),
  ].filter(Boolean).map(String);
}

function normalizedCaptionShape(caption, businessContext) {
  return lower(caption, "")
    .replaceAll(lower(businessContext.businessName), "{{business}}")
    .replaceAll(lower(businessContext.businessType), "{{type}}")
    .replaceAll(lower(businessContext.city), "{{city}}")
    .replaceAll(lower(businessContext.productsOrServices), "{{offer}}")
    .replaceAll(lower(businessContext.audience), "{{audience}}")
    .replace(/\b(restaurant|salon|clinic|boutique|software|product|service|shop|store|agency|tuition|cleaning|real estate)\b/g, "{{type}}")
    .replace(/[^a-z0-9{}]+/g, " ")
    .trim();
}

function calendarSignature(day) {
  return lower(day.title || day.topic || day.hook, "")
    .replace(/\b(day|post|reel|carousel|story|google|whatsapp)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");
}

function repairText(value) {
  if (typeof value !== "string") return value;
  let text = value;
  const replacements = [
    [/specific difference/gi, "clear reason"],
    [/choose us/gi, "choose this business"],
    [/this problem feels familiar/gi, "if this is something you need"],
    [/being built for you/gi, "prepared for local customers"],
    [/show what is coming/gi, "show a real preview"],
    [/prototype/gi, "sample"],
    [/first draft/gi, "first sample"],
    [/reply with your situation/gi, "message the details"],
    [/pain point/gi, "customer worry"],
    [/solution for you/gi, "help for this"],
    [/unlock growth/gi, "get clearer action"],
    [/take your business to the next level/gi, "make the next step clear"],
    [/best quality service/gi, "clear and reliable service"],
    [/contact us for more details/gi, "message for the next step"],
    [/we are here to help/gi, "message if you need this"],
    [/here is one real look at ([^.]+)\./gi, "See the details before you decide."],
    [/send us what you need and we will guide the next step/gi, "Tell us the option you want and we will share the clearest next step"],
    [/if this is useful/gi, "when you are ready"],
  ];
  for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
  return text;
}

function deepRepair(value) {
  if (Array.isArray(value)) return value.map(deepRepair);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepRepair(child)]));
  }
  return repairText(value);
}

export function validateMarketingOutput(output, businessContext, industryPack, goalStrategy) {
  const strings = collectStrings(output);
  const text = strings.join("\n").toLowerCase();
  const bannedHits = BANNED_MARKETING_PHRASES.filter(phrase => text.includes(phrase));
  const startupLanguageHits = businessContext.parentCategory === "software"
    ? []
    : NON_SOFTWARE_STARTUP_TERMS.filter(term => text.includes(term));
  const repeatedTemplateHits = [
    countPhrase(text, "here is one real look at") > 3 ? "More than 3 captions use 'Here is one real look at...'" : "",
    text.includes("send us what you need") ? "Strategy copy uses 'Send us what you need...'" : "",
    countPhrase(text, "if this is useful") > 0 ? "Captions use 'if this is useful'" : "",
  ].filter(Boolean);
  const isSoftware = businessContext.parentCategory === "software";
  const isLocalSoftware = /local|on[-\s]?premise|desktop kiosk|installed/i.test(`${businessContext.productsOrServices} ${businessContext.businessType}`);
  const saasLocalMismatchHits = isSoftware && !isLocalSoftware
    ? ["local awareness", "visits", "walk-ins", "walkins", "orders"].filter(term => text.includes(term))
    : [];
  const saasWrongIndustryHits = isSoftware
    ? ["salon", "restaurant", "cafe", "dental clinic", "boutique", "store visit", "shop entrance"].filter(term => text.includes(term))
    : [];
  const cleaningLanguageHits = /cleaning|laundry|housekeeping/i.test(`${businessContext.businessType} ${businessContext.productsOrServices}`) && text.includes("technician")
    ? ["Cleaning service uses technician language"]
    : [];
  const realEstateCtaHits = /real estate|property|broker|agent/i.test(`${businessContext.businessType} ${businessContext.productsOrServices}`) && text.includes("request a quote")
    ? ["Real estate uses Request a quote instead of property-specific CTA"]
    : [];
  const foodWrongLanguageHits = businessContext.parentCategory === "food_beverage"
    ? ["beta", "onboarding", "activation", "demo request", "checkout"].filter(term => text.includes(term))
    : [];
  const healthcareWrongLanguageHits = businessContext.parentCategory === "healthcare"
    ? ["delivery", "first order", "checkout", "service person", "add to cart"].filter(term => text.includes(term))
    : [];
  const ecommerceWrongLanguageHits = businessContext.parentCategory === "ecommerce"
    ? ["patient", "clinic timing", "appointment process", "beta access", "walk-in"].filter(term => text.includes(term))
    : [];
  const serviceWrongLanguageHits = businessContext.parentCategory === "professional_service"
    ? ["menu", "checkout", "walk-in", "shop visit", "add to cart"].filter(term => text.includes(term))
    : [];
  const captions = captionsFromOutput(output);
  const captionShapes = new Set(captions.map(caption => normalizedCaptionShape(caption, businessContext)));
  const captionSwapHits = captions.length >= 8 && captionShapes.size <= Math.ceil(captions.length / 3)
    ? ["Captions look like one template with swapped business words"]
    : [];

  const calendar = output?.tabs?.calendar?.days || output?.calendar || [];
  const allowedCtas = unique([
    getBestCustomerAction(goalStrategy, industryPack, businessContext.parentCategory),
    ...industryPack.recommendedCTAs,
  ]).map(item => lower(item));
  const specificityTerms = unique([
    businessContext.businessName,
    businessContext.businessType,
    businessContext.city,
    businessContext.productsOrServices,
    businessContext.audience,
    ...industryPack.vocabulary,
    ...industryPack.trustFactors,
  ]).map(item => lower(item)).filter(item => item.length > 2);

  const calendarIssues = [];
  const signatures = new Map();
  for (const day of calendar) {
    const body = flattenText(day);
    const show = day.whatToShow || day.what_to_show || "";
    const action = lower(day.customerAction || day.customer_action || "");
    const hasShootable = /\b(record|photo|show|post|say|film|shoot|make|create|write|share|ask|display|capture)\b/i.test(show);
    const hasSpecificity = specificityTerms.some(term => lower(body).includes(term));
    const hasCta = allowedCtas.some(cta => action.includes(cta) || cta.includes(action));
    if (!hasShootable || !hasSpecificity || !hasCta) {
      calendarIssues.push({
        day: day.day,
        hasShootable,
        hasSpecificity,
        hasCta,
      });
    }
    const signature = calendarSignature(day);
    signatures.set(signature, (signatures.get(signature) || 0) + 1);
  }

  const repeatedIdeas = Array.from(signatures.entries()).filter(([, count]) => count > 2).map(([signature]) => signature);
  const semanticAlignment = validateSemanticAlignment(output, businessContext);
  const issues = [
    ...bannedHits.map(hit => `Banned phrase: ${hit}`),
    ...startupLanguageHits.map(hit => `Wrong business language: ${hit}`),
    ...repeatedTemplateHits,
    ...saasLocalMismatchHits.map(hit => `SaaS output uses local-only action: ${hit}`),
    ...saasWrongIndustryHits.map(hit => `SaaS output uses wrong-industry language: ${hit}`),
    ...cleaningLanguageHits,
    ...realEstateCtaHits,
    ...foodWrongLanguageHits.map(hit => `Food output uses wrong-context language: ${hit}`),
    ...healthcareWrongLanguageHits.map(hit => `Clinic output uses wrong-context language: ${hit}`),
    ...ecommerceWrongLanguageHits.map(hit => `Ecommerce output uses wrong-context language: ${hit}`),
    ...serviceWrongLanguageHits.map(hit => `Service output uses wrong-context language: ${hit}`),
    ...captionSwapHits,
    ...calendarIssues.map(issue => `Calendar day ${issue.day} failed quality checks`),
    ...repeatedIdeas.map(hit => `Repeated calendar idea: ${hit}`),
    ...semanticAlignment.issues,
  ];

  return {
    passed: issues.length === 0,
    issues,
    bannedHits,
    startupLanguageHits,
    repeatedTemplateHits,
    saasLocalMismatchHits,
    saasWrongIndustryHits,
    cleaningLanguageHits,
    realEstateCtaHits,
    foodWrongLanguageHits,
    healthcareWrongLanguageHits,
    ecommerceWrongLanguageHits,
    serviceWrongLanguageHits,
    captionSwapHits,
    calendarIssues,
    repeatedIdeas,
    semanticAlignment,
    qualityScore: scoreMarketingOutputIssues(issues),
  };
}

function scoreMarketingOutputIssues(issues) {
  return Math.max(0, Math.min(100, 100 - issues.length * 8));
}

export function scoreMarketingOutput(output, businessContext, industryPack, goalStrategy) {
  return validateMarketingOutput(output, businessContext, industryPack, goalStrategy).qualityScore;
}

function buildSeedExamples() {
  const examples = [];
  for (const category of PARENT_CATEGORIES) {
    const pack = getIndustryPack(category);
    for (const goal of CORE_SEED_GOALS) {
      const goalStrategy = getGoalStrategy(goal);
      for (let index = 0; index < 5; index += 1) {
        const idea = pack.shootablePostIdeas[index % pack.shootablePostIdeas.length];
        examples.push({
          parentCategory: category,
          goal,
          title: `${goal.replace(/_/g, " ")} - ${idea[0]}`,
          whatToShow: idea[1],
          customerAction: getBestCustomerAction(goalStrategy, pack, category),
          whyThisHelps: idea[2],
        });
      }
    }
  }
  return examples;
}

export const STRATEGY_SEED_EXAMPLES = buildSeedExamples();

export function buildMarketingOSReport({ businessProfile = {}, rawBiz = {}, telemetry = {} }) {
  const context = normalizeBusinessContext(businessProfile, rawBiz);
  const pack = adaptIndustryPackForContext(getIndustryPack(context), context);
  const goalStrategy = getGoalStrategy(context.selectedGoal);
  context.trustNeeds = pack.trustFactors;
  context.customerAction = getBestCustomerAction(goalStrategy, pack, context.parentCategory);
  const hashtags = buildHashtags(context, pack);
  const calendar = buildCalendar(context, pack, goalStrategy, hashtags);
  const strategy = buildStrategySteps(context, pack, goalStrategy);
  const psychology = { customer_thoughts: buildPsychology(context, pack) };
  const personas = buildPersonas(context, pack);
  const painPoints = buildCustomerProblems(context, pack);
  const competitors = buildCompetitors(context, pack);
  const ideas = buildIdeas(context, pack, goalStrategy);
  const captions = buildCaptionBank(context, pack, goalStrategy);
  const templates = buildTemplates(context, pack);
  const brandKit = buildBrandKit(context, pack);
  const premiumGrowth = buildPremiumGrowth(context, pack, goalStrategy);
  const scores = buildScores(context, pack);
  const fullReport = buildFullReport(context, pack, goalStrategy, calendar, strategy, personas, templates);
  const sections = makeFlatSections(context, pack, goalStrategy, calendar, strategy, ideas, captions, templates, hashtags);
  const metrics = metricsForContext(context);

  let workspace = {
    business: {
      name: context.businessName,
      category: context.businessType,
      location: context.location,
      tag: `${context.businessType} · ${context.city}`,
      positioning_summary: sections["Business Health Snapshot"].diagnosis,
      customer_model: context.audience,
      operating_model: context.parentCategory,
    },
    meta: {
      generation_source: "marketing_os_rules",
      ai_calls_count: telemetry.ai_calls_count || 0,
      knowledge_objects_used: telemetry.knowledge_objects_used || 0,
      strategy_blocks_used: telemetry.strategy_blocks_used || 0,
      strategy_library_preview: Boolean(telemetry.strategy_blocks_used),
      fallback_used: Boolean(telemetry.fallback_used),
      modules_generated: 13,
      missing_sections_filled: [],
      quality_checks: {
        passed: true,
        validator: "goal_industry_marketing_os",
        selected_goal: context.selectedGoal,
        parent_category: context.parentCategory,
        brief_subtype: context.briefSubtype,
      },
    },
    scores,
    tabs: {
      calendar: { days: calendar },
      strategy: { steps: strategy },
      psychology,
      clientPersona: { personas },
      painPoints: { items: painPoints },
      competitors,
      ideas: { experiments: ideas },
      captions: {
        caption_bank: captions,
        hashtag_bank: hashtags,
        suggested_topics: calendar.slice(0, 6).map(day => day.title),
      },
      templates: { templates },
      brandKit,
      roiTool: {
        average_transaction: clean(businessProfile.offering?.averageTicket || rawBiz.biz_ticket, "Not provided"),
        assumptions: {
          selected_goal: context.selectedGoal,
          main_customer_action: context.customerAction,
          track_weekly: metrics.weekly,
        },
        adjustable_inputs: {
          extra_customers: 10,
          people_who_buy_after_seeing_ad_percent: 8,
          monthly_budget: clean(businessProfile.economics?.marketingBudget || rawBiz.biz_budget, "Not provided"),
        },
        note: context.briefSubtype === "nonprofit_education"
          ? "Use this only as a rough planning helper. Replace it with real application, referral, volunteer, and partnership response numbers later."
          : context.parentCategory === "software"
          ? "Use this only as a rough planning helper. Replace it with real demo, trial, and lead numbers later."
          : "Use this only as a rough planning helper. Replace it with real order numbers later.",
      },
      premiumGrowth: { modules: premiumGrowth },
      fullReport,
    },
  };

  workspace = deepRepair(workspace);
  const repairedSections = deepRepair(sections);
  const validation = validateMarketingOutput(workspace, context, pack, goalStrategy);
  workspace.meta.quality_checks = {
    ...workspace.meta.quality_checks,
    passed: validation.passed,
    issues: validation.issues,
  };

  return {
    context,
    industryPack: pack,
    goalStrategy,
    workspace,
    sections: repairedSections,
    validation,
  };
}
