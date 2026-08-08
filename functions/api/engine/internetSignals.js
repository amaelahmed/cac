function clean(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) return value.map(item => clean(item)).filter(Boolean).join(" ") || fallback;
  if (typeof value === "object") return Object.values(value).map(item => clean(item)).filter(Boolean).join(" ") || fallback;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function lower(value, fallback = "") {
  return clean(value, fallback).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values, limit = 6) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = clean(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text.slice(0, 160));
    if (out.length >= limit) break;
  }
  return out;
}

function textFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "";
  return lower([
    snapshot.title,
    snapshot.description,
    ...asArray(snapshot.headings),
    ...asArray(snapshot.callsToAction),
    ...asArray(snapshot.detectedGaps),
    snapshot.text,
  ].join(" "));
}

function visiblePhrases(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return [];
  return unique([
    snapshot.title,
    snapshot.description,
    ...asArray(snapshot.headings),
    ...asArray(snapshot.callsToAction).map(item => `Action shown: ${item}`),
  ], 6);
}

function hasAny(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

function businessKind(profile = {}, rawBiz = {}) {
  const text = lower([
    profile?.market?.industry,
    profile?.identity?.type,
    profile?.offering?.coreOffer,
    rawBiz?.biz_industry,
    rawBiz?.biz_type,
    rawBiz?.biz_offer,
  ].join(" "));

  if (/saas|software|app|platform|startup|ai tool|automation|dashboard|workflow/.test(text)) return "saas";
  if (/clinic|dental|dentist|doctor|hospital|therapy|treatment|medical|health/.test(text)) return "clinic";
  if (/cafe|restaurant|food|bakery|juice|tea|coffee|cloud kitchen|menu/.test(text)) return "food";
  if (/ecommerce|e-commerce|d2c|online store|fashion|clothing|product store|checkout|delivery/.test(text)) return "ecommerce";
  if (/agency|consulting|service|studio|freelance|marketing|design|development|real estate|cleaning/.test(text)) return "service";
  return "general";
}

function clarity(text, patterns) {
  if (!text) return "missing";
  return hasAny(text, patterns) ? "clear" : "weak";
}

function contextRules(kind) {
  const common = {
    cta: [/book/i, /call/i, /contact/i, /whatsapp/i, /enquire/i, /get started/i, /start/i],
    proof: [/review/i, /testimonial/i, /case study/i, /rating/i, /client/i, /customer/i, /before/i, /after/i, /result/i],
    process: [/price/i, /pricing/i, /plan/i, /step/i, /process/i, /how it works/i, /time/i, /delivery/i, /book/i, /contact/i],
    trust: [/review/i, /testimonial/i, /rating/i, /case study/i, /client/i, /doctor/i, /team/i, /secure/i, /guarantee/i, /portfolio/i],
  };

  if (kind === "saas") {
    return {
      ...common,
      cta: [/demo/i, /trial/i, /signup/i, /sign up/i, /waitlist/i, /beta/i, /start/i, /book/i],
      offer: [/software/i, /app/i, /platform/i, /dashboard/i, /automation/i, /workflow/i, /tool/i, /ai/i],
      audience: [/founder/i, /team/i, /business/i, /user/i, /customer/i, /startup/i, /marketer/i],
      missing: [
        "What happens after signup?",
        "Can buyers see one real product screen?",
        "Can they understand the result before starting?",
      ],
      hesitation: "SaaS buyers hesitate when they cannot picture what happens after login.",
      recommendation: "Show one short screen recording of the first useful result before asking people to sign up.",
    };
  }

  if (kind === "food") {
    return {
      ...common,
      cta: [/order/i, /reserve/i, /book/i, /menu/i, /call/i, /whatsapp/i, /visit/i],
      offer: [/menu/i, /dish/i, /food/i, /coffee/i, /cake/i, /meal/i, /restaurant/i, /cafe/i],
      audience: [/family/i, /student/i, /office/i, /foodie/i, /customer/i, /near/i, /local/i],
      missing: [
        "Can hungry customers see the best items quickly?",
        "Is the order or visit step obvious?",
        "Is price range or menu clarity visible?",
      ],
      hesitation: "Hungry customers choose faster when they do not have to ask basic menu and order questions.",
      recommendation: "Show the top items, price range, order method, and best time to visit in one simple post.",
    };
  }

  if (kind === "clinic") {
    return {
      ...common,
      cta: [/appointment/i, /book/i, /consultation/i, /call/i, /whatsapp/i, /visit/i],
      offer: [/clinic/i, /doctor/i, /treatment/i, /consultation/i, /dental/i, /therapy/i, /patient/i],
      audience: [/patient/i, /family/i, /doctor/i, /children/i, /adult/i, /local/i],
      missing: [
        "What happens in the first appointment?",
        "Can nervous patients see the doctor or process?",
        "Is booking explained calmly?",
      ],
      hesitation: "Patients trust faster when the process feels predictable and calm.",
      recommendation: "Explain what happens in the first appointment before asking people to book.",
    };
  }

  if (kind === "ecommerce") {
    return {
      ...common,
      cta: [/buy/i, /shop/i, /checkout/i, /order/i, /cart/i, /whatsapp/i],
      offer: [/product/i, /shop/i, /collection/i, /delivery/i, /size/i, /fit/i, /custom/i],
      audience: [/shopper/i, /women/i, /men/i, /student/i, /customer/i, /buyer/i, /gen-z/i],
      missing: [
        "Can shoppers see product proof before checkout?",
        "Are delivery, size, or return doubts answered?",
        "Is first purchase risk reduced?",
      ],
      hesitation: "First-time shoppers need risk reduced before checkout.",
      recommendation: "Show the product in use, delivery time, support clarity, and one real review near the top.",
    };
  }

  if (kind === "service") {
    return {
      ...common,
      cta: [/book/i, /call/i, /proposal/i, /quote/i, /discovery/i, /enquire/i, /whatsapp/i, /contact/i],
      offer: [/service/i, /project/i, /portfolio/i, /case study/i, /consulting/i, /solution/i],
      audience: [/client/i, /business/i, /founder/i, /owner/i, /home/i, /team/i],
      missing: [
        "Can buyers see proof before booking a call?",
        "Is the service process simple?",
        "Can they judge fit before sharing details?",
      ],
      hesitation: "Service buyers need proof of thinking before they book a call.",
      recommendation: "Create one simple case-study post: problem, process, result, and lesson.",
    };
  }

  return {
    ...common,
    offer: [/service/i, /product/i, /solution/i, /shop/i, /business/i],
    audience: [/customer/i, /client/i, /buyer/i, /business/i, /student/i, /family/i],
    missing: [
      "What exactly should customers do first?",
      "Can they see proof before trusting the business?",
      "Is price, process, or contact clarity visible?",
    ],
    hesitation: "Customers delay when the next step feels unclear or risky.",
    recommendation: "Put the offer, proof, and one simple next step close together.",
  };
}

function analyzeSnapshot(snapshot, kind, role) {
  const text = textFromSnapshot(snapshot);
  const rules = contextRules(kind);
  const ctaVisible = hasAny(text, rules.cta);
  const proofVisible = hasAny(text, rules.proof);
  const processVisible = hasAny(text, rules.process);
  const trustSignals = unique([
    proofVisible ? "Visible proof or trust language" : "",
    hasAny(text, [/review/i, /rating/i]) ? "Reviews or ratings are mentioned" : "",
    hasAny(text, [/case study/i, /portfolio/i, /client/i]) ? "Work proof is visible" : "",
    hasAny(text, [/doctor/i, /team/i, /founder/i]) ? "People/team proof is visible" : "",
    hasAny(text, [/address/i, /location/i, /kozhikode/i, /calicut/i, /kerala/i]) ? "Location proof is visible" : "",
  ], 5);
  const missingQuestions = rules.missing.filter((_, index) => {
    if (index === 0) return !proofVisible;
    if (index === 1) return !processVisible;
    return !ctaVisible;
  });
  const useful = visiblePhrases(snapshot);

  return {
    available: Boolean(snapshot),
    offer_clarity: clarity(text, rules.offer),
    audience_clarity: clarity(text, rules.audience),
    proof_visible: proofVisible,
    pricing_or_process_visible: processVisible,
    cta_visible: ctaVisible,
    trust_signals: trustSignals,
    missing_questions: missingQuestions.length ? missingQuestions : ["Keep checking whether the first action is easy to understand."],
    customer_hesitations: unique([
      !proofVisible ? "They may want proof before trusting the business." : "",
      !processVisible ? "They may not know what happens after they message or sign up." : "",
      !ctaVisible ? "They may leave because the first action is not obvious." : "",
      rules.hesitation,
    ], 4),
    useful_phrases: useful,
    simple_recommendations: unique([
      !ctaVisible ? "Make one next step impossible to miss." : "",
      !proofVisible ? "Show one real proof point before asking for action." : "",
      !processVisible ? "Explain the price, process, timing, or first step in simple words." : "",
      rules.recommendation,
    ], 4),
    role,
  };
}

export function extractInternetSignals({ ownSnapshot, competitorSnapshot, businessProfile, rawBiz } = {}) {
  const kind = businessKind(businessProfile, rawBiz);
  const own = analyzeSnapshot(ownSnapshot, kind, "own_website");
  const competitor = analyzeSnapshot(competitorSnapshot, kind, "competitor");
  const usedOwnWebsite = Boolean(ownSnapshot);
  const usedCompetitor = Boolean(competitorSnapshot);

  return {
    internet_enrichment: usedOwnWebsite || usedCompetitor ? "used" : "unavailable",
    business_kind: kind,
    used_own_website: usedOwnWebsite,
    used_competitor: usedCompetitor,
    own_website: own,
    competitor: {
      ...competitor,
      competitor_advantages: usedCompetitor
        ? unique([
            competitor.proof_visible ? "They show trust proof more clearly." : "",
            competitor.pricing_or_process_visible ? "They make process or pricing easier to understand." : "",
            competitor.cta_visible ? "They make the next step easier to spot." : "",
            ...competitor.trust_signals,
          ], 4)
        : [],
      positioning_gaps: usedCompetitor
        ? unique([
            !own.proof_visible && competitor.proof_visible ? "Match their proof with your own real example." : "",
            !own.pricing_or_process_visible && competitor.pricing_or_process_visible ? "Make your process clearer than theirs." : "",
            !own.cta_visible && competitor.cta_visible ? "Make your first action clearer than theirs." : "",
            "Win with simpler examples, faster replies, and a clearer first step.",
          ], 4)
        : [],
    },
    user_note: usedOwnWebsite || usedCompetitor ? "Used your website details to make this more specific." : "",
  };
}
