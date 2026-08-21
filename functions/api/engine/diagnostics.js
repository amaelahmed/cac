/**
 * Evidence-based diagnostics.
 *
 * Replaces the old `buildScores()` heuristic, which computed headline numbers
 * from form completeness:
 *
 *     const profileDepth = [usp, audience, challenge, coreOffer].filter(Boolean).length * 7;
 *     const content = clampScore(32 + profileDepth + ...);
 *
 * That produced a number that moved when the user typed more, not when their
 * business improved. This module instead runs a fixed set of named checks.
 * Every check reports one of three states:
 *
 *   pass     - we looked, and the thing is there
 *   fail     - we looked, and it is missing
 *   unknown  - we could not look (no website given, nothing to inspect)
 *
 * A score is the weighted pass-rate over the checks we could actually run.
 * `unknown` checks are excluded from the denominator and surfaced to the user
 * as "not checked" rather than silently folded into a number. Each check also
 * records whether its evidence was `verified` (we fetched the page and looked)
 * or `self_reported` (the user ticked a box), so the report can say which.
 */

const GENERIC_CLAIM_PATTERNS = [
  /\bbest (quality|service|price|in town)\b/i,
  /\bhigh[- ]quality\b/i,
  /\baffordable\b/i,
  /\bcustomer satisfaction\b/i,
  /\bwe care\b/i,
  /\btrusted\b/i,
  /\bone[- ]stop\b/i,
  /\bworld[- ]class\b/i,
  /\bpassionate\b/i,
  /\bunique\b/i,
  /\bcheap(est)?\b/i,
  /\bgood service\b/i,
];

const SPECIFIC_CLAIM_PATTERNS = [
  /\d/,
  /\bwithin \w+\b/i,
  /\bsame day\b/i,
  /\bhours?\b/i,
  /\bdays?\b/i,
  /\bfree\b/i,
  /\bguarantee\b/i,
  /\bonly\b/i,
  /\bwithout\b/i,
  /\bno \w+\b/i,
];

const BANDS = [
  { min: 70, label: "Solid", tone: "good" },
  { min: 40, label: "Needs work", tone: "warn" },
  { min: 0, label: "Weak", tone: "bad" },
];

const VERIFIED = "verified";
const SELF_REPORTED = "self_reported";

function text(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) return value.filter(Boolean).join(" ").trim() || fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function platformsOf(rawBiz) {
  const list = Array.isArray(rawBiz?.platforms) ? rawBiz.platforms : [];
  return list.map(item => text(item)).filter(item => item && item !== "None yet");
}

function hasPlatform(rawBiz, pattern) {
  return platformsOf(rawBiz).some(item => pattern.test(item));
}

function wordCount(value) {
  const raw = text(value);
  return raw ? raw.split(/\s+/).length : 0;
}

function bandFor(score) {
  return BANDS.find(entry => score >= entry.min) || BANDS[BANDS.length - 1];
}

/**
 * Judge a line the user wrote about their own business. This is honest to
 * report on because we are grading their words, not guessing at their market.
 */
function claimQuality(value) {
  const raw = text(value);
  if (!raw) return { verdict: "missing", generic: [], specific: [] };

  const generic = GENERIC_CLAIM_PATTERNS
    .filter(pattern => pattern.test(raw))
    .map(pattern => raw.match(pattern)?.[0])
    .filter(Boolean);
  const specific = SPECIFIC_CLAIM_PATTERNS.filter(pattern => pattern.test(raw));

  if (wordCount(raw) < 4) return { verdict: "too_short", generic, specific };
  if (generic.length > 0 && specific.length === 0) return { verdict: "generic", generic, specific };
  if (specific.length >= 1 && wordCount(raw) >= 5) return { verdict: "specific", generic, specific };
  return { verdict: "vague", generic, specific };
}

/**
 * Every check is a pure function of the gathered context. Keeping them as data
 * means the report can list exactly what was and was not inspected.
 */
function quote(value, limit = 120) {
  const source = String(value || "").replace(/\s+/g, " ").trim();
  return source.length > limit ? `${source.slice(0, limit - 1)}\u2026` : source;
}

const CHECKS = [
  // ---- Group: findability -------------------------------------------------
  {
    id: "has_website",
    group: "findability",
    question: "Do you have a website a stranger can open?",
    weight: 3,
    fixes: "website_basic",
    run: ({ rawBiz }) => {
      const site = text(rawBiz?.biz_website);
      return site
        ? { status: "pass", source: SELF_REPORTED, evidence: `You gave us ${site}.` }
        : { status: "fail", source: SELF_REPORTED, evidence: "No website address was given in your brief." };
    },
  },
  {
    id: "website_reachable",
    group: "findability",
    question: "Does your website actually load for us?",
    weight: 3,
    fixes: "website_basic",
    run: ({ rawBiz, own }) => {
      if (!text(rawBiz?.biz_website)) {
        return { status: "unknown", source: null, evidence: "No website address given, so there was nothing to open." };
      }
      return own?.available
        ? { status: "pass", source: VERIFIED, evidence: "We opened your website and read the page." }
        : { status: "fail", source: VERIFIED, evidence: "We tried to open your website and could not read it. Customers may hit the same problem." };
    },
  },
  {
    id: "multi_channel",
    group: "findability",
    question: "Are you reachable in more than one place?",
    weight: 2,
    fixes: "second_channel",
    run: ({ rawBiz }) => {
      const platforms = platformsOf(rawBiz);
      if (platforms.length === 0) {
        return { status: "fail", source: SELF_REPORTED, evidence: "You did not select any channel you are active on." };
      }
      return platforms.length >= 2
        ? { status: "pass", source: SELF_REPORTED, evidence: `You told us you are on ${platforms.join(", ")}.` }
        : { status: "fail", source: SELF_REPORTED, evidence: `You are only on ${platforms[0]}. If that one goes quiet, you have nowhere else to be found.` };
    },
  },
  {
    id: "google_listing",
    group: "findability",
    question: "Can nearby customers find you on Google Maps?",
    weight: 3,
    fixes: "google_profile",
    run: ({ rawBiz, isLocal }) => {
      if (!isLocal) {
        return { status: "unknown", source: null, evidence: "You sell online rather than to a local area, so a Maps listing is not the main way people find you." };
      }
      return hasPlatform(rawBiz, /google/i)
        ? { status: "pass", source: SELF_REPORTED, evidence: "You told us you have a Google Business profile." }
        : { status: "fail", source: SELF_REPORTED, evidence: "You did not list Google Business as one of your channels. Local searches will not surface you." };
    },
  },

  // ---- Group: clarity -----------------------------------------------------
  {
    id: "usp_is_specific",
    group: "clarity",
    question: "Does your one-line pitch say something a competitor could not copy?",
    weight: 3,
    fixes: "sharpen_usp",
    run: ({ rawBiz, profile }) => {
      const usp = text(profile?.offering?.usp || rawBiz?.biz_usp);
      const quality = claimQuality(usp);
      if (quality.verdict === "missing") {
        return { status: "fail", source: SELF_REPORTED, evidence: "You did not give us a line about why someone should choose you." };
      }
      if (quality.verdict === "specific") {
        return { status: "pass", source: SELF_REPORTED, evidence: `Your line — "${usp}" — names something concrete.` };
      }
      if (quality.generic.length) {
        return {
          status: "fail",
          source: SELF_REPORTED,
          evidence: `Your line — "${usp}" — leans on "${quality.generic[0]}". Every competitor says that too, so it does not help anyone choose.`,
        };
      }
      return {
        status: "fail",
        source: SELF_REPORTED,
        evidence: `Your line — "${usp}" — does not include anything a customer could check, like a time, a price, a number, or a promise.`,
      };
    },
  },
  {
    id: "audience_is_narrow",
    group: "clarity",
    question: "Do you know exactly who you are selling to?",
    weight: 2,
    fixes: "narrow_audience",
    run: ({ rawBiz, profile }) => {
      const audience = text(profile?.customers?.audience || rawBiz?.biz_audience);
      if (!audience) {
        return { status: "fail", source: SELF_REPORTED, evidence: "You did not describe your customer." };
      }
      if (/\b(everyone|anyone|all|general public|any ?body)\b/i.test(audience)) {
        return { status: "fail", source: SELF_REPORTED, evidence: `You described your customer as "${audience}". Selling to everyone means writing for no one.` };
      }
      // Word count is not evidence. A three-word blob passes a length test while
      // describing nobody, which is exactly the "scores how much you typed"
      // failure this module exists to remove. Judge the claim, like usp_is_specific does.
      const quality = claimQuality(audience);
      if (quality.verdict === "specific") {
        return { status: "pass", source: SELF_REPORTED, evidence: `You described your customer as "${quote(audience)}".` };
      }
      if (quality.generic.length) {
        return {
          status: "fail",
          source: SELF_REPORTED,
          evidence: `"${quote(audience)}" leans on "${quality.generic[0]}", which describes almost any buyer. Name who they are, where they are, and what they are trying to get done.`,
        };
      }
      return {
        status: "fail",
        source: SELF_REPORTED,
        evidence: `"${quote(audience)}" does not narrow anyone down yet. Name who they are, where they are, and what they are trying to get done.`,
      };
    },
  },
  {
    id: "site_states_offer",
    group: "clarity",
    question: "Does your website say what you sell, above the fold?",
    weight: 3,
    fixes: "website_headline",
    run: ({ own }) => {
      if (!own?.available) {
        return { status: "unknown", source: null, evidence: "You did not give us a website address, so there was nothing to read." };
      }
      return own.offer_clarity === "clear"
        ? { status: "pass", source: VERIFIED, evidence: "Your page headings name what you actually sell." }
        : { status: "fail", source: VERIFIED, evidence: "We read your page headings and still could not tell what you sell. A first-time visitor will not work harder than we did." };
    },
  },
  {
    id: "site_states_price_or_process",
    group: "clarity",
    question: "Does your website answer 'what will this cost me and what happens next'?",
    weight: 3,
    fixes: "publish_process",
    run: ({ own }) => {
      if (!own?.available) {
        return { status: "unknown", source: null, evidence: "You did not give us a website address, so there was nothing to read." };
      }
      return own.pricing_or_process_visible
        ? { status: "pass", source: VERIFIED, evidence: "Your page mentions price, steps, or timing." }
        : { status: "fail", source: VERIFIED, evidence: "Your page never mentions price, steps, or timing. This is the single most common reason people close a tab without messaging." };
    },
  },

  // ---- Group: trust -------------------------------------------------------
  {
    id: "site_shows_proof",
    group: "trust",
    question: "Is there any evidence on your site that other people bought from you?",
    weight: 3,
    fixes: "add_proof",
    run: ({ own }) => {
      if (!own?.available) {
        return { status: "unknown", source: null, evidence: "You did not give us a website address, so there was nothing to read." };
      }
      return own.proof_visible
        ? { status: "pass", source: VERIFIED, evidence: `We found trust signals on your page: ${(own.trust_signals || []).slice(0, 2).join("; ") || "reviews or customer language"}.` }
        : { status: "fail", source: VERIFIED, evidence: "We found no reviews, testimonials, photos of real work, or named customers anywhere on the page." };
    },
  },
  {
    id: "audience_exists",
    group: "trust",
    question: "Do you have an audience that already listens to you?",
    weight: 1,
    fixes: "build_audience",
    run: ({ rawBiz, profile }) => {
      const followers = text(profile?.channels?.instagramFollowers || rawBiz?.biz_followers);
      if (!followers) {
        return { status: "unknown", source: null, evidence: "You did not tell us your follower count." };
      }
      if (/not active|not on|none|^0$/i.test(followers)) {
        return { status: "fail", source: SELF_REPORTED, evidence: "You have no following yet, so nothing you post reaches anyone by itself." };
      }
      if (/500|2,?000/.test(followers)) {
        return { status: "fail", source: SELF_REPORTED, evidence: `${followers} is a small base. Treat posts as something you send to people, not something that finds them.` };
      }
      return { status: "pass", source: SELF_REPORTED, evidence: `You told us you have ${followers}.` };
    },
  },
  {
    id: "beats_competitor_on_clarity",
    group: "trust",
    question: "Is your site clearer than the competitor you named?",
    weight: 2,
    fixes: "close_competitor_gap",
    run: ({ own, competitor, usedCompetitor }) => {
      if (!usedCompetitor || !competitor?.available) {
        return { status: "unknown", source: null, evidence: "You did not give us a competitor website to compare against." };
      }
      if (!own?.available) {
        return { status: "unknown", source: null, evidence: "We read your competitor's site but had none of yours to compare it against." };
      }
      const ourPoints = [own.cta_visible, own.proof_visible, own.pricing_or_process_visible].filter(Boolean).length;
      const theirPoints = [competitor.cta_visible, competitor.proof_visible, competitor.pricing_or_process_visible].filter(Boolean).length;
      return ourPoints >= theirPoints
        ? { status: "pass", source: VERIFIED, evidence: `On the three basics — clear action, visible proof, visible price or process — you score ${ourPoints}/3 and they score ${theirPoints}/3.` }
        : { status: "fail", source: VERIFIED, evidence: `On the three basics — clear action, visible proof, visible price or process — they score ${theirPoints}/3 and you score ${ourPoints}/3. A buyer comparing both tabs picks them.` };
    },
  },

  // ---- Group: next step ---------------------------------------------------
  {
    id: "site_has_clear_action",
    group: "action",
    question: "Is it obvious what a visitor should do next?",
    weight: 3,
    fixes: "single_cta",
    run: ({ own }) => {
      if (!own?.available) {
        return { status: "unknown", source: null, evidence: "You did not give us a website address, so there was nothing to read." };
      }
      return own.cta_visible
        ? { status: "pass", source: VERIFIED, evidence: "Your page has a visible next step." }
        : { status: "fail", source: VERIFIED, evidence: "We found no obvious button or instruction telling a visitor what to do. Interested people leave because you never asked." };
    },
  },
  {
    id: "direct_reply_channel",
    group: "action",
    question: "Can a customer reach a human quickly?",
    weight: 2,
    fixes: "whatsapp_setup",
    run: ({ rawBiz }) => {
      return hasPlatform(rawBiz, /whatsapp|call|phone/i)
        ? { status: "pass", source: SELF_REPORTED, evidence: "You told us customers can reach you on WhatsApp or phone." }
        : { status: "fail", source: SELF_REPORTED, evidence: "You listed no direct reply channel. Every question has to survive a form or a DM queue before it reaches you." };
    },
  },
];

const SCORE_GROUPS = [
  {
    id: "findability",
    label: "Can a new customer find you?",
    plainMeaning: {
      good: "Someone who has never heard of you can stumble across you. Keep it that way.",
      warn: "You are findable if someone already knows your name. Nobody new is finding you by accident.",
      bad: "Right now, only people you personally tell can find you. Every customer costs you a conversation.",
    },
  },
  {
    id: "clarity",
    label: "Can they tell what you sell?",
    plainMeaning: {
      good: "A stranger understands your offer without asking. That is rare.",
      warn: "People get the general idea but have to ask basic questions. Most will not bother asking.",
      bad: "A first-time visitor cannot tell what you sell or what it costs. They leave and you never know they were there.",
    },
  },
  {
    id: "trust",
    label: "Is there a reason to believe you?",
    plainMeaning: {
      good: "There is visible evidence other people bought from you and were fine.",
      warn: "You have some proof, but not where a hesitant buyer will see it.",
      bad: "Nothing on your side shows a real person has bought from you. Buyers assume the worst by default.",
    },
  },
  {
    id: "action",
    label: "Is the next step obvious?",
    plainMeaning: {
      good: "An interested person knows exactly what to do and can do it in one tap.",
      warn: "There is a way to contact you, but they have to look for it.",
      bad: "Interested people have nowhere obvious to go. This is the cheapest thing on this list to fix.",
    },
  },
];

function isLocalBusiness(profile, rawBiz) {
  const type = text(rawBiz?.biz_type).toLowerCase();
  const location = text(profile?.market?.location || rawBiz?.biz_location).toLowerCase();
  if (/online only|saas|subscription app|ai \/ vibe-coded app/.test(type)) return false;
  if (/^online$|global|worldwide|remote/.test(location)) return false;
  return true;
}

/**
 * Run every check and fold the results into per-group scores.
 */
export function runDiagnostics({ businessProfile, rawBiz, internetSignals } = {}) {
  const ctx = {
    profile: businessProfile || {},
    rawBiz: rawBiz || {},
    own: internetSignals?.own_website || null,
    competitor: internetSignals?.competitor || null,
    usedCompetitor: Boolean(internetSignals?.used_competitor),
    isLocal: isLocalBusiness(businessProfile, rawBiz),
  };

  const checks = CHECKS.map(check => {
    let result;
    try {
      result = check.run(ctx) || {};
    } catch {
      result = { status: "unknown", source: null, evidence: "This check could not run." };
    }
    return {
      id: check.id,
      group: check.group,
      question: check.question,
      weight: check.weight,
      fixes: check.fixes,
      status: result.status || "unknown",
      source: result.source || null,
      evidence: result.evidence || "",
    };
  });

  const scores = SCORE_GROUPS.map(group => {
    const groupChecks = checks.filter(check => check.group === group.id);
    const answerable = groupChecks.filter(check => check.status !== "unknown");
    const skipped = groupChecks.filter(check => check.status === "unknown");
    const earned = answerable
      .filter(check => check.status === "pass")
      .reduce((sum, check) => sum + check.weight, 0);
    const available = answerable.reduce((sum, check) => sum + check.weight, 0);

    // No answerable check means no score. We say so instead of inventing one.
    if (available === 0) {
      return {
        id: group.id,
        label: group.label,
        score: null,
        band: "Not checked",
        tone: "unknown",
        confidence: "none",
        caveat: "We had nothing to inspect here, so we are not going to invent a number.",
        plain_meaning: "We could not check this. Add your website address and re-run to get a real answer here.",
        checks_run: 0,
        checks_total: groupChecks.length,
        verified_count: 0,
        passed: [],
        failed: [],
        not_checked: skipped.map(check => ({ question: check.question, why: check.evidence })),
        reason: `0 of ${groupChecks.length} checks could run.`,
      };
    }

    const score = Math.round((earned / available) * 100);
    const band = bandFor(score);
    const verifiedCount = answerable.filter(check => check.source === VERIFIED).length;

    // A group that scored 100 off one self-reported tickbox is not the same
    // claim as one that scored 100 off four checks, two of them made by
    // opening the site. The number stays honest either way; the caveat stops
    // it from reading as a verdict it has not earned.
    const groupConfidence = answerable.length >= 3 && verifiedCount >= 1
      ? "high"
      : answerable.length >= 2
        ? "medium"
        : "low";
    const caveat = groupConfidence === "low"
      ? `This is based on a single check${verifiedCount === 0 ? " that came from your own answers, not from anything we inspected" : ""}. Treat it as a hint, not a verdict.`
      : verifiedCount === 0
        ? "Every check here came from what you typed in, not from anything we could inspect."
        : "";

    return {
      id: group.id,
      label: group.label,
      score,
      band: band.label,
      tone: band.tone,
      confidence: groupConfidence,
      caveat,
      plain_meaning: group.plainMeaning[band.tone],
      checks_run: answerable.length,
      checks_total: groupChecks.length,
      verified_count: verifiedCount,
      passed: answerable
        .filter(check => check.status === "pass")
        .map(check => ({ question: check.question, evidence: check.evidence, source: check.source })),
      failed: answerable
        .filter(check => check.status === "fail")
        .map(check => ({ question: check.question, evidence: check.evidence, source: check.source, fixes: check.fixes })),
      not_checked: skipped.map(check => ({ question: check.question, why: check.evidence })),
      reason: `${answerable.length} of ${groupChecks.length} checks could run${verifiedCount ? `, ${verifiedCount} by opening your website` : ", all from what you told us"}.`,
    };
  });

  const answerableAll = checks.filter(check => check.status !== "unknown");
  const verifiedAll = checks.filter(check => check.source === VERIFIED);
  const coverage = {
    checks_total: checks.length,
    checks_run: answerableAll.length,
    checks_verified: verifiedAll.length,
    percent_run: Math.round((answerableAll.length / checks.length) * 100),
    // The honest headline. If this is low, the report says so up front.
    confidence: answerableAll.length >= checks.length * 0.75
      ? "high"
      : answerableAll.length >= checks.length * 0.4
        ? "medium"
        : "low",
    how_to_improve: verifiedAll.length === 0
      ? "We checked only what you typed into the form. Add your website address and a competitor's, then re-run — that turns guesses into checks we can actually make."
      : "",
  };

  return { checks, scores, coverage };
}

/* ------------------------------------------------------------------------- *
 * Ranking
 *
 * The old report showed five "moves" as equals. This orders them, and shows
 * why each one earned its place, using effort and cost the owner can feel.
 * ------------------------------------------------------------------------- */

const EFFORT_TIERS = [
  { id: "minutes", label: "About 15 minutes", hours: 0.25 },
  { id: "hour", label: "About an hour", hours: 1 },
  { id: "half_day", label: "Half a day", hours: 4 },
  { id: "days", label: "A day or two", hours: 12 },
  { id: "weeks", label: "One to two weeks", hours: 60 },
];

function effortTier(id) {
  return EFFORT_TIERS.find(tier => tier.id === id) || EFFORT_TIERS[2];
}

/**
 * Infer how long something takes and what it costs from the words used.
 * Deliberately conservative: when unsure we assume more work, not less, so we
 * never tell someone a two-week job is a quick win.
 */
const MONEY_TIERS = ["Free", "Small spend", "Real budget"];

function estimateCost(title, action) {
  const blob = `${text(title)} ${text(action)}`.toLowerCase();

  const rules = [
    { match: /\b(quick repl|saved repl|bio|highlight|pin|profile photo|add logo|business profile|auto.?reply)\b/, effort: "minutes", money: "Free" },
    { match: /\b(write|rewrite|one sentence|one line|headline|caption|describe|list out|note down|track)\b/, effort: "hour", money: "Free" },
    { match: /\b(google business|maps listing|claim)\b/, effort: "hour", money: "Free" },
    { match: /\b(ask .*(review|referral)|message .*(customer|past)|share with friends)\b/, effort: "hour", money: "Free" },
    { match: /\b(post|story|reel|carousel|photo|video|shoot|record)\b/, effort: "half_day", money: "Free" },
    { match: /\b(website|landing page|checkout|form)\b/, effort: "days", money: "Small spend" },
    { match: /\b(sample|prototype|make \d|prepare \d|inventory|stock|menu card|packaging)\b/, effort: "weeks", money: "Real budget" },
    { match: /\b(ad|ads|boost|campaign|paid)\b/, effort: "half_day", money: "Real budget" },
  ];

  // A task described as "shoot photos of 5 samples" is a sampling job that also
  // involves a photoshoot, not a quick photoshoot. Taking the first matching
  // rule would under-quote it, so every match is considered and the most
  // expensive one wins. Under-promising effort is the failure mode that makes
  // people abandon a plan halfway through.
  const hits = rules.filter(rule => rule.match.test(blob));
  if (hits.length === 0) return { effort: effortTier("half_day"), money: "Free" };

  const effort = hits
    .map(hit => effortTier(hit.effort))
    .reduce((worst, tier) => (tier.hours > worst.hours ? tier : worst));
  const money = hits
    .map(hit => hit.money)
    .reduce((worst, tier) => (MONEY_TIERS.indexOf(tier) > MONEY_TIERS.indexOf(worst) ? tier : worst));

  return { effort, money };
}

/**
 * Impact is earned, not assigned: a recommendation scores by how many failed
 * checks it repairs, weighted by how much those checks matter.
 */
function impactFor(recommendation, diagnostics) {
  const failed = diagnostics.checks.filter(check => check.status === "fail");
  const blob = `${text(recommendation.title)} ${text(recommendation.action)}`.toLowerCase();

  const direct = failed.filter(check => check.fixes && recommendation.fixes === check.fixes);
  const keyworded = failed.filter(check => {
    if (direct.includes(check)) return false;
    const keywords = FIX_KEYWORDS[check.fixes] || [];
    return keywords.some(word => blob.includes(word));
  });

  // Highest-weight failure first, so the "why this one" line quotes the most
  // serious thing this recommendation repairs rather than whichever check
  // happened to match first.
  const matched = [...direct, ...keyworded].sort((a, b) => b.weight - a.weight);

  // A check we could not run is not evidence that things are fine. For a
  // business with no website, "is there proof on your site" comes back unknown
  // — and building that proof is exactly what they should be doing. Unknowns
  // therefore count toward what to do next, at half weight, while still being
  // excluded from the score itself.
  const unresolved = diagnostics.checks.filter(check => {
    if (check.status !== "unknown") return false;
    if (matched.includes(check)) return false;
    if (recommendation.fixes === check.fixes) return true;
    const keywords = FIX_KEYWORDS[check.fixes] || [];
    return keywords.some(word => blob.includes(word));
  });

  const weight = matched.reduce((sum, check) => sum + check.weight, 0)
    + unresolved.reduce((sum, check) => sum + check.weight / 2, 0);

  return {
    // 0 matched failures still gets a floor of 1 — it may be good general advice.
    value: Math.max(1, Math.min(5, Math.round(weight))),
    fixes: matched,
    unresolved,
  };
}

const FIX_KEYWORDS = {
  // Phrases, not bare words. Single words like "explain" or "action" matched
  // almost every recommendation, which made the report cite the wrong failure.
  website_basic: ["website", "web page", "landing page"],
  second_channel: ["second channel", "another platform", "more than one place"],
  google_profile: ["google business", "google profile", "maps listing", "google basics"],
  sharpen_usp: ["one sentence", "one line", "why they should choose", "choose you", "pitch"],
  narrow_audience: ["who to start with", "customer type", "example customer"],
  website_headline: ["headline", "above the fold", "explain what you sell"],
  publish_process: ["show price", "price clarity", "pricing", "how to order", "order process", "ordering", "delivery area", "process simply", "what happens next"],
  add_proof: ["proof", "review", "testimonial", "sample", "real example", "case study", "before and after"],
  build_audience: ["follower", "share with friends", "reach more"],
  close_competitor_gap: ["competitor", "compare with"],
  single_cta: ["next step", "one clear action", "contact button", "easy to contact"],
  whatsapp_setup: ["whatsapp", "saved repl", "quick repl", "reply faster"],
};

/**
 * Turn benchmark thresholds into something an owner can read a result against.
 * These are diagnostic thresholds for reading signal — not revenue promises —
 * and the report labels them as such.
 */
const TARGETS_BY_FIX = {
  google_profile: {
    watch: "Views on your Google listing",
    good_sign: "Any weekly views at all within 14 days means the listing is live and being shown.",
    bad_sign: "Zero views after two weeks usually means the listing is unverified — not that nobody is searching.",
  },
  whatsapp_setup: {
    watch: "How long a first message waits before you reply",
    good_sign: "Most first messages answered the same day, two weeks running.",
    bad_sign: "If messages sit overnight, fix this before anything else on the list.",
  },
  publish_process: {
    watch: "How often 'how much?' is the first thing someone asks",
    good_sign: "That question getting rarer means your pricing is where people look.",
    bad_sign: "If it is still the opening question every time, the information is not findable.",
  },
  add_proof: {
    watch: "People referring to something they saw before they messaged",
    good_sign: "Messages that open with 'I saw the...' mean your proof is being read.",
    bad_sign: "If nobody mentions it, it is probably too far down the page.",
  },
  sharpen_usp: {
    watch: "Whether people repeat your line back to you",
    good_sign: "Someone describing your business the way you wrote it means the line landed.",
    bad_sign: "If people still describe you generically, try a different line.",
  },
  single_cta: {
    watch: "Messages that arrive without you chasing",
    good_sign: "Any rise in unprompted enquiries within a month.",
    bad_sign: "No change means the action is still not where people look.",
  },
  website_basic: {
    watch: "Whether people can find you without asking you for a link",
    good_sign: "Someone reaching you through search rather than a link you sent.",
    bad_sign: "If every customer still needs a link from you, the site is not doing its job yet.",
  },
};

/**
 * The repair for each failed check, in the owner's language.
 *
 * The report could already say "you have no website" but had no action that
 * said "make one" - the ranked list is built from content ideas, so the fix for
 * a broken basic never appeared in it. A report that names a problem and then
 * recommends something else is worse than one that says nothing.
 *
 * These are deliberately boring and concrete. No campaign, no funnel: the one
 * thing that turns this check from a fail into a pass.
 */
export const DIRECT_FIXES = {
  website_basic: {
    action: "Put up a simple one-page website",
    why: "Right now a stranger cannot look you up. Only people you personally message can find you.",
    steps: [
      "One page is enough: what you do, who it is for, what it costs, how to contact you.",
      "Use your business name in the address so people can guess it.",
      "Put your phone or WhatsApp number where it is visible without scrolling.",
    ],
  },
  second_channel: {
    action: "Add one more place people can find you",
    why: "You are on one channel. If it goes quiet, so does your business.",
    steps: [
      "Pick one more place your customers already look.",
      "Put the same offer and the same contact detail there.",
      "Post there once a week, not daily.",
    ],
  },
  google_profile: {
    action: "Set up your free Google Business profile",
    why: "When someone nearby searches for what you sell, you do not come up at all.",
    steps: [
      "Search 'Google Business Profile' and claim your business - it is free.",
      "Add your hours, area, phone number and five real photos.",
      "Ask three past customers to leave a review.",
    ],
  },
  sharpen_usp: {
    action: "Write one line that says why you and not someone else",
    why: "Your advantage reads like something every competitor also claims, so it does not help anyone choose.",
    steps: [
      "Pick the one thing you do that a competitor genuinely cannot copy this month.",
      "Say it in plain words a customer would use, not marketing words.",
      "Put that line at the top of every page and profile.",
    ],
  },
  narrow_audience: {
    action: "Name exactly who you are for",
    why: "A description that fits everybody gives nobody a reason to feel it is meant for them.",
    steps: [
      "Describe your best customer: who they are, what they need, when they need it.",
      "Write for that one person, not for everyone.",
      "It is fine to lose the people who were never going to buy.",
    ],
  },
  website_headline: {
    action: "Say what you sell at the very top of your page",
    why: "A first-time visitor cannot tell what you sell or what it costs, so they leave.",
    steps: [
      "First line: what you sell and who it is for.",
      "Second line: what it costs, or the range.",
      "Then one button with the next step.",
    ],
  },
  publish_process: {
    action: "Show how you actually work, step by step",
    why: "People hesitate when they cannot picture what happens after they contact you.",
    steps: [
      "Write out what happens from first message to finished job.",
      "Say how long each step takes.",
      "Publish it where a new customer will see it before asking.",
    ],
  },
  add_proof: {
    action: "Put up three real customer proofs",
    why: "Nothing on your side shows a real person has bought from you, so buyers assume the worst.",
    steps: [
      "Ask three past customers for one honest line about what changed for them.",
      "Use their real first name and, if they agree, a photo.",
      "Put them where the price is, not on a separate page.",
    ],
  },
  build_audience: {
    action: "Start collecting the people who already know you",
    why: "You are starting from zero with every post because nothing keeps the people who liked you last time.",
    steps: [
      "Save the phone numbers of everyone who has ever enquired.",
      "Message that list once a month with something useful, not a sale.",
      "Ask every new customer if they want to be on it.",
    ],
  },
  close_competitor_gap: {
    action: "Do the one thing your competitor does not",
    why: "Customers compare you with somebody else, and right now the comparison does not favour you.",
    steps: [
      "Look at your closest competitor and write down what they show that you do not.",
      "Pick the one gap you can close this week.",
      "Close it, and say plainly that you do it.",
    ],
  },
  single_cta: {
    action: "Give people exactly one next step",
    why: "An interested person does not know what to do next, so they do nothing.",
    steps: [
      "Choose one action: message, call, or book.",
      "Use the same words for it everywhere.",
      "Remove the other buttons competing with it.",
    ],
  },
  whatsapp_setup: {
    action: "Make WhatsApp the easy way to reach you",
    why: "People will message where they already are, if you let them.",
    steps: [
      "Set up WhatsApp Business - it is free.",
      "Write a greeting that answers your two most common questions.",
      "Put the WhatsApp link in every profile and on your page.",
    ],
  },
};

/**
 * The repairs for the checks that actually failed in one area, worst first.
 */
export function directFixesFor(scoreGroup) {
  const seen = new Set();
  return (scoreGroup?.failed || [])
    .map(item => {
      const fix = DIRECT_FIXES[item.fixes];
      if (!fix || seen.has(item.fixes)) return null;
      seen.add(item.fixes);
      return { ...fix, because: item.evidence, fixes: item.fixes };
    })
    .filter(Boolean);
}

/**
 * Give the owner something to read the result against. These are thresholds
 * for telling signal from noise, not revenue promises, and the report says so.
 */
function targetFor(recommendation, impact) {
  const primary = impact.fixes[0] || impact.unresolved?.[0];
  if (primary && TARGETS_BY_FIX[primary.fixes]) return TARGETS_BY_FIX[primary.fixes];

  return {
    watch: "Real enquiries, not likes or views",
    good_sign: impact.value >= 4
      ? "This repairs something broken, so expect movement in enquiries within two to four weeks."
      : "Give this 30 days before judging it.",
    bad_sign: "No change in enquiries after a month means the problem is somewhere else on this list.",
  };
}

/**
 * Write the 'why you' line from the user's own data. If a recommendation
 * repairs a check we saw fail, we quote that failure back to them.
 */
function becauseFor(recommendation, impact, ctx) {
  if (impact.fixes.length > 0) {
    const primary = impact.fixes[0];
    const verified = primary.source === VERIFIED;
    return `${verified ? "We opened your website and found this" : "From what you told us"}: ${primary.evidence}`;
  }

  if (impact.unresolved?.length) {
    return `We could not check this one: ${impact.unresolved[0].evidence} Doing this is how you make it checkable.`;
  }

  const budget = text(ctx?.rawBiz?.biz_budget);
  if (/zero|organic|under/i.test(budget)) {
    return "You told us you have no ad budget, so this is here because it costs nothing but your time.";
  }
  return "This is standard groundwork — worth doing, but not the thing holding you back right now.";
}

/**
 * Order recommendations so the cheapest fixes for the worst problems come
 * first. Two things with equal impact are separated by how long they take.
 */
export function rankRecommendations(recommendations, diagnostics, ctx = {}) {
  const list = Array.isArray(recommendations) ? recommendations : [];

  const scored = list.map((recommendation, index) => {
    const impact = impactFor(recommendation, diagnostics);
    const { effort, money } = estimateCost(recommendation.title, recommendation.action);

    // Impact dominates; effort breaks ties. Squaring impact keeps a genuine
    // fix ahead of three trivial chores that happen to be fast.
    const priority = (impact.value * impact.value) / Math.max(0.25, Math.sqrt(effort.hours));

    return {
      ...recommendation,
      original_index: index,
      impact: impact.value,
      impact_label: impact.value >= 4 ? "Fixes something broken" : impact.value >= 2 ? "Worth doing" : "Nice to have",
      fixes_checks: impact.fixes.map(check => check.question),
      effort: effort.label,
      effort_hours: effort.hours,
      money,
      because: becauseFor(recommendation, impact, ctx),
      target: targetFor(recommendation, impact),
      priority_score: Math.round(priority * 100) / 100,
    };
  });

  scored.sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    if (a.effort_hours !== b.effort_hours) return a.effort_hours - b.effort_hours;
    return a.original_index - b.original_index;
  });

  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
    when: index < 3 ? "Start here this week" : index < 7 ? "Next two weeks" : "Once the basics are done",
  }));
}

/**
 * The single most useful sentence in the report: if you do one thing, do this.
 */
export function headlineAction(ranked, diagnostics) {
  const top = Array.isArray(ranked) ? ranked[0] : null;
  if (!top) return null;

  const worst = [...(diagnostics?.scores || [])]
    .filter(score => typeof score.score === "number")
    .sort((a, b) => a.score - b.score)[0];

  return {
    do_this: top.title,
    time_needed: top.effort,
    cost: top.money,
    why: top.because,
    weakest_area: worst ? worst.label : null,
    weakest_band: worst ? worst.band : null,
    if_you_only_do_one_thing: `${top.title} — ${top.effort}, ${top.money.toLowerCase()}.`,
  };
}

export const __testing = { claimQuality, estimateCost, bandFor, isLocalBusiness };
