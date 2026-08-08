import { commitKnowledgeObjects, parseKnowledgePayload } from "../../utils/knowledge-object-io";

export async function onRequestPost(context) {
  const { env, request } = context;
  const userEmail = context.data?.user?.email || "system";

  try {
    const url = new URL(request.url);
    const updateMode = url.searchParams.get("update") === "true";
    const parsed = await parseKnowledgePayload(request);
    const result = await commitKnowledgeObjects(env.DB, parsed.objects, userEmail, {
      format: parsed.format,
      updateMode,
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 201 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
