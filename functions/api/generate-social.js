import { getRequestSession } from "./utils/auth";
import { callControlledAi } from "./utils/controlled-ai.js";
import { isMeaningfulText } from "./utils/input-quality";

const PROMPT_VERSION = "social-nvidia-v1";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fallbackCaptions({ businessName, industry, offer, location, platform }) {
  return {
    captions: [
      {
        hook: `${businessName} is getting ready in ${location || "your area"}.`,
        caption: `${businessName} is preparing ${offer || industry} with a simple promise: clear details, easy ordering, and no confusion. Message us to know how it works.`,
        cta: platform === "WhatsApp" ? "Reply with your question." : "Send us a DM.",
      },
      {
        hook: "See before you order.",
        caption: `We will show clear details before you decide. If you want ${offer || "this"}, ask us for the steps and price range.`,
        cta: "Message preview.",
      },
      {
        hook: "First customers matter.",
        caption: `${businessName} is starting carefully so every first customer gets proper attention. Tell us what you need and we will guide you.`,
        cta: "Ask how to order.",
      },
    ],
    fallback: true,
  };
}

function fallbackHashtags({ businessName, industry, location }) {
  const city = String(location || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const brand = String(businessName || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const niche = String(industry || "").toLowerCase().includes("gift") ? "customgifts" : "localbusiness";
  return {
    hashtags: [
      `#${brand || "localbrand"}`,
      city ? `#${city}` : "#localbusiness",
      "#keralabusiness",
      `#${niche}`,
      "#instagramindia",
      "#smallbusinessindia",
      "#madeinindia",
      "#supportlocal",
      "#whatsappbusiness",
      "#newlaunch",
    ],
    fallback: true,
  };
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const session = await getRequestSession(env, request);

    if (!session || !session.user) {
      return json({ error: { message: "Unauthorized" } }, 401);
    }

    if (env.EMERGENCY_KILL_SWITCH_AI === "true") {
      return json({ error: { message: "AI generation is temporarily disabled." } }, 503);
    }

    const body = await request.json();
    const mode = body.mode === "hashtags" ? "hashtags" : "captions";
    const businessName = String(body.businessName || "").trim();
    const industry = String(body.industry || "").trim();
    const offer = String(body.offer || "").trim();
    const location = String(body.location || "").trim();
    const platform = String(body.platform || "Instagram").trim();
    const brief = String(body.brief || "").trim();

    if (!isMeaningfulText(businessName) || !isMeaningfulText(industry) || !isMeaningfulText(offer)) {
      return json({ error: { message: "Business name, industry, and offer need real details." } }, 422);
    }

    const profile = { businessName, industry, offer, location, platform };
    const fallback = mode === "hashtags"
      ? fallbackHashtags(profile)
      : fallbackCaptions(profile);
    const schema = mode === "hashtags"
      ? '{"hashtags":["#..."]}'
      : '{"captions":[{"hook":"...","caption":"...","cta":"..."}]}';
    const task = mode === "hashtags"
      ? "Create 24 useful hashtags. Mix local, niche, buyer-intent, and brand hashtags. Avoid generic spam."
      : `Create 5 simple ${platform} captions. Each caption needs one hook, one short caption, and one clear next step.`;

    const result = await callControlledAi(context, {
      userId: session.user.id,
      featureType: mode,
      sectionName: mode,
      promptVersion: PROMPT_VERSION,
      businessProfile: profile,
      input: { ...profile, brief, mode },
      messages: [
        {
          role: "system",
          content: "You write simple social media copy for small Indian businesses. No jargon. No long paragraphs. Return valid JSON only.",
        },
        {
          role: "user",
          content: `${task}

Business:
Name: ${businessName}
Industry: ${industry}
Offer: ${offer}
Location: ${location || "local market"}
Platform: ${platform}
Brief: ${brief || "No extra brief"}

Return only JSON in this shape:
${schema}`,
        },
      ],
      maxTokens: mode === "hashtags" ? 900 : 1400,
      fallback,
    });

    const data = result.data || fallback;
    return json({
      ...data,
      cached: result.cached || false,
      fallback: result.fallbackUsed || data.fallback || false,
      message: result.message,
    });
  } catch (error) {
    console.error("Error in /api/generate-social:", error?.message || error);
    return json({ error: { message: "Internal server error." } }, 500);
  }
}
