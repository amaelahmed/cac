export const STRATEGY_BLOCK_SCORING_WEIGHTS = {
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
  context_family_match: 18,
  high_specificity_bonus: 10,
  psychology_signal_bonus: 8,
  weak_or_generic_penalty: -40,
  wrong_context_penalty: -120,
  repeated_topic_penalty: -30,
};

export const STRATEGY_SECTION_QUOTAS = {
  simple_summary: 3,
  first_priority: 3,
  customer_question: 8,
  confidence_step: 8,
  instagram_action: 8,
  whatsapp_message: 8,
  seven_day_plan: 7,
  thirty_day_calendar: 30,
  caption: 10,
  measurement: 5,
  google_business_action: 4,
  offer_idea: 4,
  local_action: 5,
};

function clean(value) {
  return String(value || "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function normalizeTag(value) {
  return lower(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function addTag(set, value) {
  const tag = normalizeTag(value);
  if (tag) set.add(tag);
}

function addTagsFromText(set, text, pairs) {
  const source = lower(text);
  for (const [pattern, tag] of pairs) {
    if (pattern.test(source)) addTag(set, tag);
  }
}

function parseTagList(value) {
  if (Array.isArray(value)) return value.map(normalizeTag).filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parseTagList(parsed);
    } catch {
      return value.split(",").map(normalizeTag).filter(Boolean);
    }
  }
  return [normalizeTag(value)].filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function joinedText(values) {
  return lower(values.flat().filter(Boolean).join(" "));
}

function hasCustomProduct(profile, rawBiz) {
  const text = lower([
    profile?.identity?.name,
    profile?.market?.industry,
    profile?.offering?.coreOffer,
    profile?.offering?.usp,
    rawBiz?.biz_name,
    rawBiz?.biz_industry,
    rawBiz?.biz_offer,
    rawBiz?.biz_usp,
    rawBiz?.biz_extra,
  ].filter(Boolean).join(" "));

  if (/\b(no|not|without|never)\s+(\bcustom\b|customis|customiz|personalised|personalized|made[-\s]?to[-\s]?order|printing|printed|name print)/.test(text)) {
    return false;
  }

  return /\bcustom\b|customis|customiz|personalised|personalized|made[-\s]?to[-\s]?order|name print|photo gift|photo print|printed gift|custom gift|personalised gift|personalized gift|portrait gift|caricature gift|cartoon gift|custom hamper|printed t[-\s]?shirt|custom t[-\s]?shirt|custom phone case|photo frame/.test(text);
}

function hasPreLaunch(profile, rawBiz) {
  const text = lower([
    profile?.identity?.stage,
    profile?.identity?.age,
    rawBiz?.biz_stage,
    rawBiz?.biz_age,
  ].filter(Boolean).join(" "));

  return /idea|not launched|pre[-\s]?launch|prelaunch|before launch|launching soon|yet to launch/.test(text);
}

function locationTags(profile, rawBiz) {
  const tags = new Set();
  const text = lower([
    profile?.market?.location,
    rawBiz?.biz_location,
    rawBiz?.location_insight?.displayName,
    rawBiz?.location_insight?.city,
    rawBiz?.location_insight?.state,
    rawBiz?.location_insight?.country,
  ].filter(Boolean).join(" "));

  addTagsFromText(tags, text, [
    [/kozhikode|calicut/, "kozhikode"],
    [/kozhikode|calicut/, "calicut"],
    [/kerala/, "kerala"],
    [/india|kerala|kozhikode|calicut/, "india"],
    [/college|campus|student/, "college_area"],
  ]);

  if (text && !/online|global/.test(text)) addTag(tags, "local_city");
  return Array.from(tags);
}

function platformTags(profile, rawBiz) {
  const tags = new Set();
  const platforms = [
    ...(Array.isArray(profile?.channels?.platforms) ? profile.channels.platforms : []),
    ...(Array.isArray(rawBiz?.platforms) ? rawBiz.platforms : []),
    rawBiz?.biz_website ? "website" : "",
    rawBiz?.biz_comp_website ? "competitor_website" : "",
  ].join(" ");

  addTagsFromText(tags, platforms, [
    [/instagram|reel|story/, "instagram"],
    [/reel/, "reels"],
    [/stor(y|ies)/, "stories"],
    [/whatsapp|wa\b/, "whatsapp"],
    [/google|maps|local search/, "google_business"],
    [/website/, "website"],
  ]);

  return Array.from(tags);
}

function businessName(profile, rawBiz) {
  return clean(profile?.identity?.name || rawBiz?.biz_name || "this business");
}

function cityName(profile, rawBiz) {
  const location = clean(profile?.market?.location || rawBiz?.biz_location || rawBiz?.location_insight?.city || "your market");
  return location.split(",")[0].trim() || location;
}

function audienceName(profile, rawBiz) {
  return lower(profile?.customers?.audience || rawBiz?.biz_audience || "the right customers") || "the right customers";
}

function naturalCalendarReason(block, profile, rawBiz) {
  const name = businessName(profile, rawBiz);
  const city = cityName(profile, rawBiz);
  const audience = audienceName(profile, rawBiz);
  const topic = lower(block.content_json?.topic || block.title);

  if (/launch teaser|first look/.test(topic)) {
    return `This helps because people need to understand what ${name} sells before opening day.`;
  }
  if (/order|whatsapp|walkthrough|checklist/.test(topic)) {
    return `This helps because custom product buyers need to know how ordering works before they message.`;
  }
  if (/price/.test(topic)) {
    return `This helps because ${audience} may avoid messaging if they think the product will be too expensive.`;
  }
  if (/mistake|preview|confirm/.test(topic)) {
    return "This helps because custom orders can go wrong if spelling, photo, colour, size, or date are not checked.";
  }
  if (/delivery|pickup|area/.test(topic)) {
    return `This helps because people in ${city} need to know if they can receive the product easily.`;
  }
  if (/sample|making|before|after|material|packaging/.test(topic)) {
    return "This helps before launch because people need to see real products before they trust a new shop.";
  }
  if (/student|college|birthday|farewell|gift/.test(topic)) {
    return `This helps because ${audience} need a clear occasion before they decide to order.`;
  }
  if (/google/.test(topic)) {
    return `This helps because local buyers in ${city} trust a business more when they can find it on Google.`;
  }
  if (/offer|first 10|referral/.test(topic)) {
    return "This helps because early buyers need a simple reason to act now without feeling pressured.";
  }

  return block.content_json?.why_this_helps
    ? `${block.content_json.why_this_helps} It fits ${name} because the page needs simple proof before launch.`
    : `This fits ${name} because the idea is specific, easy to post, and useful before launch.`;
}

function naturalBlockReason(block, profile, rawBiz) {
  const name = businessName(profile, rawBiz);
  const city = cityName(profile, rawBiz);
  const audience = audienceName(profile, rawBiz);
  const preLaunch = hasPreLaunch(profile, rawBiz);
  const customProduct = hasCustomProduct(profile, rawBiz);
  const title = lower(block.content_json?.title || block.title);

  if (block.section_type === "thirty_day_calendar") {
    return naturalCalendarReason(block, profile, rawBiz);
  }

  if (/preview|confirm|mistake/.test(title)) {
    return `This fits ${name} because custom products need clear previews, safe ordering, and trust before ${preLaunch ? "launch" : "payment"}.`;
  }
  if (/whatsapp|reply|message/.test(title) || block.section_type === "whatsapp_message") {
    return `I picked this because ${name} needs WhatsApp messages that collect the right details without confusing customers.`;
  }
  if (/google/.test(title) || block.section_type === "google_business_action") {
    return `I picked this because local buyers in ${city} are more likely to trust ${name} when they can find real photos and contact details on Google.`;
  }
  if (/instagram|bio|highlight|reel/.test(title) || block.section_type === "instagram_action") {
    return `This fits ${name} because Instagram visitors should understand the product, preview process, and WhatsApp ordering quickly.`;
  }
  if (/offer/.test(title) || block.section_type === "offer_idea") {
    return `I picked this because ${preLaunch ? "early buyers" : "new customers"} need one simple reason to try ${name} now.`;
  }
  if (/price|payment|advance/.test(title)) {
    return `This fits ${name} because ${audience} need price and payment clarity before they feel safe ordering.`;
  }
  if (/sample|making|material|final photo|packaging/.test(title)) {
    return `I picked this because ${customProduct ? "custom products" : "new businesses"} need real examples before customers trust the order.`;
  }
  if (preLaunch && customProduct) {
    return `I picked this because ${name} has not launched yet, sells customised products, and needs ${audience} in ${city} to trust the order process before paying.`;
  }
  if (preLaunch) {
    return `I picked this because ${name} has not launched yet and needs a clear first-customer plan before chasing bigger growth.`;
  }

  return `I picked this because it gives ${name} a simple action customers can understand and respond to.`;
}

export function deriveStrategyBlockTags(profile, rawBiz = {}) {
  const preLaunch = hasPreLaunch(profile, rawBiz);
  const customProduct = hasCustomProduct(profile, rawBiz);
  const industryText = lower([profile?.market?.industry, rawBiz?.biz_industry].filter(Boolean).join(" "));
  const offerText = lower([profile?.offering?.coreOffer, rawBiz?.biz_offer].filter(Boolean).join(" "));
  const audienceText = lower([profile?.customers?.audience, rawBiz?.biz_audience].filter(Boolean).join(" "));
  const modelText = lower([profile?.identity?.type, profile?.customers?.model, rawBiz?.biz_type, rawBiz?.biz_customer_model].filter(Boolean).join(" "));
  const goalText = lower([profile?.objectives?.goals, rawBiz?.goal].flat().filter(Boolean).join(" "));
  const challengeText = lower([profile?.customers?.challenge, rawBiz?.biz_challenge].filter(Boolean).join(" "));
  const budgetText = lower([profile?.economics?.marketingBudget, rawBiz?.biz_budget].filter(Boolean).join(" "));
  const snapshotText = lower([
    rawBiz?.own_website_snapshot?.title,
    rawBiz?.own_website_snapshot?.description,
    rawBiz?.own_website_snapshot?.headings,
    rawBiz?.own_website_snapshot?.callsToAction,
    rawBiz?.own_website_snapshot?.detectedGaps,
    rawBiz?.competitor_website_snapshot?.title,
    rawBiz?.competitor_website_snapshot?.description,
    rawBiz?.competitor_website_snapshot?.headings,
    rawBiz?.competitor_website_snapshot?.callsToAction,
    rawBiz?.competitor_website_snapshot?.detectedGaps,
  ].flat().filter(Boolean).join(" "));

  const tags = {
    launch_status: [],
    category: [],
    product_type: [],
    audience: [],
    platform: platformTags(profile, rawBiz),
    location: locationTags(profile, rawBiz),
    business_model: [],
    goal: [],
    budget: [],
    problem: [],
  };

  tags.launch_status.push(preLaunch ? "pre_launch" : "running");
  if (/first|just opened|just launched|startup|mvp|beta/.test(lower(profile?.identity?.stage))) {
    tags.launch_status.push("early_stage");
  }

  const category = new Set(tags.category);
  addTagsFromText(category, `${industryText} ${offerText}`, [
    [/retail|shop|store|boutique|e-?commerce|product|gift|clothing|fashion|jewellery|accessories/, "retail"],
    [/gift/, "gifts"],
    [/cafe|coffee|tea|bakery/, "cafe"],
    [/restaurant|food|cloud kitchen|tiffin/, "restaurant"],
    [/bakery|cake|pastry/, "bakery"],
    [/salon|beauty|barber|spa/, "salon"],
    [/gym|fitness|training|workout/, "gym"],
    [/dental|dentist|teeth|braces/, "dental_clinic"],
    [/clinic|healthcare|doctor|medical/, "healthcare"],
    [/e-?commerce|d2c|online store|online clothing/, "ecommerce"],
    [/agency|consult|consulting|studio/, "agency"],
    [/creator|media|newsletter|community|content business/, "creator"],
    [/cleaning|home service|deep clean|move[-\s]?in cleaning/, "home_service"],
    [/repair|maintenance/, "repair_service"],
    [/event|decor|wedding/, "events"],
    [/photography|photoshoot|video shoot/, "photography"],
    [/travel|trip|tour|itinerary/, "travel"],
    [/course|coaching|class|tuition|lesson/, "education"],
    [/marketplace/, "marketplace"],
    [/software|saas|app|ai tool|vibe/, "software"],
    [/\bai\b|artificial intelligence|prompt|automation/, "ai_startup"],
    [/service|consult|agency|repair|cleaning|event|photography/, "local_service"],
  ]);
  tags.category = Array.from(category);

  if (customProduct) {
    tags.product_type.push("customised_product");
    tags.category.push("customised_products");
    tags.goal.push("sell_custom_products");
    tags.problem.push("trust_issue", "quality_doubt", "unclear_order_process", "price_confusion", "delivery_doubt");
  } else {
    if (/software|saas|app|ai tool|\bai\b|platform|marketplace/.test(`${industryText} ${offerText}`)) {
      tags.product_type.push("digital_product");
    } else if (/service|consult|repair|cleaning|event|photography|appointment|clinic|dental|training|coaching|class/.test(`${industryText} ${offerText}`)) {
      tags.product_type.push("service");
    } else {
      tags.product_type.push("standard_product");
    }
  }

  const audience = new Set(tags.audience);
  addTagsFromText(audience, audienceText, [
    [/student|college|campus/, "students"],
    [/gen[-\s]?z|young|teen/, "gen_z"],
    [/family|parents/, "families"],
    [/small business|founder|owner|entrepreneur/, "small_business_owners"],
    [/developer|maker/, "developers"],
    [/women|female/, "women"],
  ]);
  tags.audience = Array.from(audience);

  const model = new Set(tags.business_model);
  addTagsFromText(model, modelText, [
    [/online|e-?commerce|website|instagram/, "online_order"],
    [/delivery/, "delivery"],
    [/pickup|collect/, "pickup"],
    [/local|physical|shop|store|walk/, "local_store"],
    [/home[-\s]?based/, "home_based"],
    [/saas|subscription|app/, "subscription"],
  ]);
  tags.business_model = Array.from(model);

  const goals = new Set(tags.goal);
  addTagsFromText(goals, `${goalText} ${challengeText}`, [
    [/first|customer|sale|lead|enquir/, "first_10_customers"],
    [/first|customer|sale|lead|enquir/, "first_30_customers"],
    [/launch|awareness/, "launch_awareness"],
    [/trust|credibility/, "build_trust"],
    [/explain|education|confusion/, "explain_product"],
    [/order|sales|sell/, "more_orders"],
    [/lead|demo|trial|waitlist|signup|sign up/, "lead_generation"],
    [/booking|appointment|consultation/, "more_bookings"],
    [/repeat|retention|come back|loyalty/, "repeat_purchase"],
    [/competitor|alternative|compare/, "differentiate"],
  ]);
  addTagsFromText(goals, snapshotText, [
    [/demo|trial|waitlist|signup|sign up|book demo/, "lead_generation"],
    [/book|appointment|consultation/, "more_bookings"],
    [/order|shop|checkout|cart|buy/, "more_orders"],
  ]);
  if (preLaunch) goals.add("first_10_customers").add("first_30_customers").add("launch_awareness");
  tags.goal = Array.from(goals);

  const budget = new Set(tags.budget);
  addTagsFromText(budget, budgetText, [
    [/none|zero|no budget|organic/, "no_budget"],
    [/low|under|small|500|1000|2000|5000/, "low_budget"],
    [/medium|10000|25000|50000/, "medium_budget"],
  ]);
  if (budget.size === 0) budget.add("low_budget");
  tags.budget = Array.from(budget);

  const problems = new Set(tags.problem);
  addTagsFromText(problems, challengeText, [
    [/trust|credibility/, "trust_issue"],
    [/price|expensive|budget/, "price_confusion"],
    [/delivery|distance|area/, "delivery_doubt"],
    [/order|confus|process/, "unclear_order_process"],
    [/content|post|idea/, "no_content"],
    [/awareness|reach|known/, "not_enough_awareness"],
    [/review|proof/, "no_reviews"],
  ]);
  addTagsFromText(problems, snapshotText, [
    [/no clear call|call-to-action|next step is not obvious|cta/, "unclear_next_step"],
    [/trust proof|proof is weak|review|testimonial|case study|rating/, "proof_gap"],
    [/pricing|price|process|timing|how it works/, "process_clarity"],
    [/competitor|case stud|portfolio|client result/, "competitor_pressure"],
  ]);
  if (rawBiz?.own_website_snapshot || rawBiz?.biz_website) problems.add("website_clarity");
  if (rawBiz?.competitor_website_snapshot || rawBiz?.biz_comp_website) problems.add("competitor_pressure");
  if (preLaunch) problems.add("no_content").add("not_enough_awareness").add("no_reviews");
  tags.problem = Array.from(problems);

  const normalized = Object.fromEntries(Object.entries(tags).map(([key, values]) => [key, unique(values.map(normalizeTag))]));
  normalized.flat = unique(Object.values(normalized).flat());
  return normalized;
}

function likePattern(tag) {
  return `%"${tag}"%`;
}

function parseBlock(row) {
  return {
    ...row,
    content_json: typeof row.content_json === "string" ? JSON.parse(row.content_json) : row.content_json,
    category_tags: parseTagList(row.category_tags),
    launch_status_tags: parseTagList(row.launch_status_tags),
    audience_tags: parseTagList(row.audience_tags),
    platform_tags: parseTagList(row.platform_tags),
    product_type_tags: parseTagList(row.product_type_tags),
    business_model_tags: parseTagList(row.business_model_tags),
    goal_tags: parseTagList(row.goal_tags),
    budget_tags: parseTagList(row.budget_tags),
    location_tags: parseTagList(row.location_tags),
    problem_tags: parseTagList(row.problem_tags),
  };
}

function overlap(blockValues, profileValues) {
  const blockSet = new Set(blockValues || []);
  return (profileValues || []).filter(value => blockSet.has(value));
}

function normalizedSignature(block) {
  return lower([
    block.content_json?.topic,
    block.content_json?.title,
    block.content_json?.what_to_do,
    block.content_json?.why_this_helps,
  ].flat().filter(Boolean).join(" "))
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function profileContextFamily(tags) {
  const values = new Set([
    ...(tags?.category || []),
    ...(tags?.product_type || []),
    ...(tags?.business_model || []),
  ]);

  if (values.has("software") || values.has("ai_startup") || values.has("digital_product") || values.has("marketplace")) return "software";
  if (values.has("dental_clinic") || values.has("healthcare")) return "clinic";
  if (values.has("cafe") || values.has("restaurant") || values.has("bakery")) return "food";
  if (values.has("ecommerce")) return "ecommerce";
  if (values.has("agency")) return "agency";
  if (values.has("creator")) return "creator";
  if (values.has("home_service") || values.has("repair_service")) return "home_service";
  if (values.has("salon") || values.has("gym")) return "local_service";
  if (values.has("retail") || values.has("gifts") || values.has("customised_products")) return "retail";
  return "general";
}

function blockContextFamily(block) {
  const text = joinedText([
    block.category_tags,
    block.product_type_tags,
    block.business_model_tags,
    block.title,
    block.section_type,
    block.content_json?.title,
    block.content_json?.topic,
    block.content_json?.what_to_do,
    block.content_json?.why_this_helps,
    block.content_json?.example,
  ]);

  if (/software|saas|ai_startup|digital_product|demo|trial|waitlist|onboarding|activation|screen recording|workflow/.test(text)) return "software";
  if (/dental|clinic|healthcare|patient|doctor|treatment|consultation|appointment/.test(text)) return "clinic";
  if (/cafe|restaurant|bakery|menu|food|dish|takeaway|table|hungry/.test(text)) return "food";
  if (/ecommerce|checkout|cart|product page|shop now|size|fit|return clarity|delivery trust|d2c/.test(text)) return "ecommerce";
  if (/agency|consulting|discovery call|proposal|portfolio|case study|retainer|client onboarding/.test(text)) return "agency";
  if (/creator|newsletter|youtube|podcast|media|community/.test(text)) return "creator";
  if (/cleaning|home service|repair|technician|housekeeping|service area/.test(text)) return "home_service";
  if (/salon|beauty|barber|spa|gym|fitness|workout|slot booking/.test(text)) return "local_service";
  if (/retail|gift|store|shop visit|custom product|customised|customized|first order/.test(text)) return "retail";
  return "general";
}

function contextCompatibility(block, tags) {
  const profileFamily = profileContextFamily(tags);
  const blockFamily = blockContextFamily(block);
  const neutral = blockFamily === "general";

  if (neutral || profileFamily === "general" || profileFamily === blockFamily) {
    return { ok: true, bonus: profileFamily === blockFamily ? STRATEGY_BLOCK_SCORING_WEIGHTS.context_family_match : 0 };
  }

  const allowed = new Set([
    "retail:ecommerce",
    "ecommerce:retail",
    "agency:software",
    "software:agency",
    "local_service:home_service",
    "home_service:local_service",
  ]);
  const pair = `${profileFamily}:${blockFamily}`;
  if (allowed.has(pair)) return { ok: true, bonus: 4 };

  return { ok: false, penalty: STRATEGY_BLOCK_SCORING_WEIGHTS.wrong_context_penalty, profileFamily, blockFamily };
}

function hasPsychologySignal(block) {
  const text = joinedText([
    block.title,
    block.content_json?.title,
    block.content_json?.why_this_helps,
    block.content_json?.why_this_works,
    block.content_json?.why_they_feel_this,
    block.content_json?.customer_problem,
    block.content_json?.problem,
    block.content_json?.example,
  ]);
  return /trust|hesitat|fear|confus|proof|price|risk|remember|habit|social proof|comparison|unclear|first[-\s]?time|repeat/.test(text);
}

function passesHardMatch(block, tags) {
  const compatibility = contextCompatibility(block, tags);
  if (!compatibility.ok) return false;

  const launchHits = overlap(block.launch_status_tags, tags?.launch_status || []);
  if (launchHits.length === 0) return false;

  const productHits = overlap(block.product_type_tags, tags?.product_type || []);
  const categoryHits = overlap(block.category_tags, tags?.category || []);
  const onlyGenericProductHit = productHits.length > 0
    && categoryHits.length === 0
    && productHits.every(tag => tag === "standard_product" || tag === "service");
  if ((productHits.length === 0 && categoryHits.length === 0) || onlyGenericProductHit) return false;

  const blockIsCustomProduct = block.product_type_tags.includes("customised_product")
    || block.category_tags.includes("customised_products");
  const profileIsCustomProduct = (tags?.product_type || []).includes("customised_product")
    || (tags?.category || []).includes("customised_products");
  if (blockIsCustomProduct && !profileIsCustomProduct) return false;

  return true;
}

export class StrategyBlockRetrieval {
  constructor(db, weights = STRATEGY_BLOCK_SCORING_WEIGHTS) {
    this.db = db;
    this.weights = weights;
  }

  async fetchCandidates({ sectionTypes, tags, candidateLimit = 320 }) {
    const sections = sectionTypes?.length ? sectionTypes : Object.keys(STRATEGY_SECTION_QUOTAS);
    const sectionPlaceholders = sections.map(() => "?").join(",");
    const tagPredicates = [];
    const tagBindings = [];

    const tagGroups = [
      ["launch_status_tags", tags?.launch_status || [], 3],
      ["category_tags", tags?.category || [], 4],
      ["product_type_tags", tags?.product_type || [], 3],
      ["audience_tags", tags?.audience || [], 4],
      ["goal_tags", tags?.goal || [], 5],
      ["platform_tags", tags?.platform || [], 5],
      ["location_tags", tags?.location || [], 5],
      ["problem_tags", tags?.problem || [], 5],
      ["business_model_tags", tags?.business_model || [], 4],
      ["budget_tags", tags?.budget || [], 3],
    ];

    for (const [column, values, limit] of tagGroups) {
      for (const tag of unique(values).slice(0, limit)) {
        tagPredicates.push(`${column} LIKE ?`);
        tagBindings.push(likePattern(tag));
      }
    }

    const matchClause = tagPredicates.length ? `AND (${tagPredicates.join(" OR ")})` : "";
    const query = `
      SELECT *
      FROM strategy_blocks
      WHERE active = 1
        AND quality_score >= 4
        AND language_level = 'beginner'
        AND section_type IN (${sectionPlaceholders})
        ${matchClause}
      ORDER BY quality_score DESC,
        CASE priority WHEN 'urgent' THEN 3 WHEN 'important' THEN 2 ELSE 1 END DESC,
        updated_at DESC
      LIMIT ?
    `;

    const { results } = await this.db.prepare(query)
      .bind(...sections, ...tagBindings, candidateLimit)
      .all();

    return (results || []).map(parseBlock);
  }

  scoreBlock(block, tags) {
    let score = 0;
    const matched = [];
    const compatibility = contextCompatibility(block, tags);
    if (!compatibility.ok) {
      return {
        score: this.weights.wrong_context_penalty,
        matchedTags: [],
      };
    }
    score += compatibility.bonus || 0;

    const add = (name, blockValues, weight) => {
      const hits = overlap(blockValues, tags?.[name] || []);
      if (hits.length > 0) {
        score += weight + Math.min(8, hits.length * 2);
        matched.push(...hits);
      }
    };

    add("launch_status", block.launch_status_tags, this.weights.launch_status_match);
    add("category", block.category_tags, this.weights.category_match);
    add("product_type", block.product_type_tags, this.weights.product_type_match);
    if (block.product_type_tags.includes("customised_product") && tags?.product_type?.includes("customised_product")) {
      score += this.weights.customised_product_match;
    }
    add("audience", block.audience_tags, this.weights.audience_match);
    add("goal", block.goal_tags, this.weights.goal_match);
    add("platform", block.platform_tags, this.weights.platform_match);
    add("location", block.location_tags, this.weights.location_match);
    add("problem", block.problem_tags, this.weights.problem_match);
    add("business_model", block.business_model_tags, this.weights.business_model_match);
    add("budget", block.budget_tags, this.weights.business_model_match);

    score += block.priority === "urgent" ? this.weights.priority_urgent : block.priority === "important" ? this.weights.priority_important : 0;
    score += block.difficulty === "easy" ? this.weights.difficulty_easy : block.difficulty === "medium" ? this.weights.difficulty_medium : 0;
    score += Number(block.quality_score) >= 5 ? this.weights.quality_score_5 : this.weights.quality_score_4;
    const specificity = [
      block.category_tags,
      block.product_type_tags,
      block.goal_tags,
      block.platform_tags,
      block.problem_tags,
      block.business_model_tags,
      block.budget_tags,
    ].filter(list => Array.isArray(list) && list.length > 0).length;
    if (specificity >= 5) score += this.weights.high_specificity_bonus;
    if (hasPsychologySignal(block)) score += this.weights.psychology_signal_bonus;

    return {
      score,
      matchedTags: unique(matched),
    };
  }

  selectBlocks(candidates, tags, profile = {}, rawBiz = {}, quotas = STRATEGY_SECTION_QUOTAS) {
    const selected = [];
    const seenSignatures = new Set();
    const scored = candidates
      .filter(block => passesHardMatch(block, tags))
      .map(block => ({ block, ...this.scoreBlock(block, tags) }))
      .sort((a, b) => b.score - a.score);

    for (const sectionType of Object.keys(quotas)) {
      const quota = quotas[sectionType];
      const sectionSelected = [];

      for (const candidate of scored.filter(item => item.block.section_type === sectionType)) {
        const signature = normalizedSignature(candidate.block);
        if (signature && seenSignatures.has(signature)) continue;

        sectionSelected.push({
          ...candidate.block,
          retrieval_score: candidate.score,
          matched_tags: candidate.matchedTags,
          why_suggested: naturalBlockReason(candidate.block, profile, rawBiz),
        });
        if (signature) seenSignatures.add(signature);
        if (sectionSelected.length >= quota) break;
      }

      selected.push(...sectionSelected);
    }

    return selected;
  }

  async retrieveForReport(profile, rawBiz = {}, options = {}) {
    const tags = deriveStrategyBlockTags(profile, rawBiz);
    const sectionTypes = options.sectionTypes || Object.keys(STRATEGY_SECTION_QUOTAS);
    const candidates = await this.fetchCandidates({
      sectionTypes,
      tags,
      candidateLimit: options.candidateLimit || 320,
    });
    const selected = this.selectBlocks(candidates, tags, profile, rawBiz, options.quotas || STRATEGY_SECTION_QUOTAS);

    return {
      tags,
      candidateCount: candidates.length,
      selectedCount: selected.length,
      selectedBlocks: selected,
    };
  }
}
