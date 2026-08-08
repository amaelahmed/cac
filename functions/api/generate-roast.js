import { getRequestSession } from "./utils/auth";
import { callControlledAi } from "./utils/controlled-ai.js";

const PROMPT_VERSION = "website-roast-nvidia-v3-dark-humour";
const DARK_HUMOUR_MARKERS = [
  /funeral/i,
  /ghost/i,
  /life support/i,
  /missing/i,
  /crime scene/i,
  /haunted/i,
  /dead/i,
  /die|dies|died/i,
  /death/i,
  /surviving on vibes/i,
];
const POLITE_HEDGES = /\b(consider|maybe|could|may|it would be good)\b/i;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fallbackRoast(websiteText) {
  const text = String(websiteText || "").toLowerCase();
  const points = [];

  if (!/book|call|contact|whatsapp|order|buy|start|get/.test(text)) {
    points.push("Your next step is hiding like it owes someone money. Put one big button at the top before visitors start planning its funeral.");
  }
  if (!/review|testimonial|customer|rating|client/.test(text)) {
    points.push("There is almost no proof here, so trust is surviving on vibes and prayers. Add one real review, result, or customer photo.");
  }
  points.push("The main message takes too long to find. In internet time, that is basically a disappearance case. Put the offer, location, and next step first.");

  return points.slice(0, 3);
}

function isDarkHumourRoast(roast) {
  if (!Array.isArray(roast) || roast.length < 3) return false;
  const text = roast.slice(0, 3).join("\n");
  const markerCount = DARK_HUMOUR_MARKERS.reduce((count, marker) => count + (marker.test(text) ? 1 : 0), 0);
  return markerCount >= 2 && !POLITE_HEDGES.test(text);
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const session = await getRequestSession(env, request);

    if (!session || !session.user) {
      return json({ error: { message: "Unauthorized" } }, 401);
    }

    if (env.EMERGENCY_KILL_SWITCH_AI === "true") {
      return json({ error: { message: "AI generation is temporarily disabled for maintenance." } }, 503);
    }

    const body = await request.json();
    const websiteText = String(body.websiteText || "").trim();
    if (!websiteText) {
      return json({ error: { message: "Website text is required." } }, 400);
    }

    const fallback = { roast: fallbackRoast(websiteText), fallback: true };
    const result = await callControlledAi(context, {
      userId: session.user.id,
      featureType: "website_roast",
      sectionName: "website_roast",
      promptVersion: PROMPT_VERSION,
      businessProfile: {
        websiteText: websiteText.slice(0, 3000),
      },
      input: {
        websiteText: websiteText.slice(0, 3000),
      },
      messages: [
        {
          role: "system",
          content: [
            "You are a dark-humour website roast assistant for small businesses in India.",
            "Use very simple English.",
            "Be sharp, dry, and funny, like a brutally honest founder friend who still wants the business to win.",
            "Make the roast darker than normal CAC copy, but keep it about the website, never the person.",
            "Use figurative dark comedy only: funeral, ghost town, life support, missing person, crime scene, haunted, dead on arrival.",
            "At least 2 of the 3 points must contain one dark-comedy metaphor.",
            "Do not sound polite. Avoid phrases like consider, maybe, could, may, or it would be good.",
            "Every point must include the problem and the fix.",
            "Do not use hate, slurs, threats, sexual content, or insults about protected groups.",
            "Do not invent problems.",
            "Return valid JSON only.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Read this website text and return exactly 3 short dark-humour roast points as JSON: {"roast":["...","...","..."]}\n\nEach roast point must be one or two sentences, simple, specific, funny, and useful.\n\nStyle examples only, do not copy exactly:\n- "Your CTA is hiding like it owes money. Put one loud button at the top before visitors arrange a funeral for their attention span."\n- "Your proof is on life support. Add one real review, result, or customer photo so trust does not die in the waiting room."\n\nWebsite text:\n${websiteText.slice(0, 3000)}`,
        },
      ],
      maxTokens: 700,
      fallback,
    });

    const data = isDarkHumourRoast(result.data?.roast)
      ? { roast: result.data.roast.slice(0, 3) }
      : fallback;
    return json({
      roast: data.roast,
      cached: result.cached || false,
      fallback: result.fallbackUsed || data.fallback || false,
      message: result.message,
    });
  } catch (error) {
    console.error("Error generating roast:", error?.message || error);
    return json({ roast: fallbackRoast(""), fallback: true }, 200);
  }
}
