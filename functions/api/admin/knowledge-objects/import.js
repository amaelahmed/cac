import { parseKnowledgePayload, validateKnowledgeObjects } from "../../utils/knowledge-object-io";

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const url = new URL(request.url);
    const updateMode = url.searchParams.get("update") === "true";
    const parsed = await parseKnowledgePayload(request);
    const preview = await validateKnowledgeObjects(env.DB, parsed.objects, {
      format: parsed.format,
      updateMode,
    });

    return new Response(JSON.stringify(preview), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
