import { toYamlExport } from "../../utils/knowledge-object-io";

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "json").toLowerCase();

  try {
    const { results } = await env.DB.prepare(`
      SELECT *
      FROM knowledge_objects
      ORDER BY industry_id, domain_id, id
    `).all();

    if (format === "yaml" || format === "yml") {
      return new Response(toYamlExport(results || []), {
        headers: {
          "Content-Type": "application/x-yaml; charset=utf-8",
          "Content-Disposition": "attachment; filename=\"knowledge_objects_export.yaml\"",
        },
      });
    }

    return new Response(JSON.stringify(results || [], null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=\"knowledge_objects_export.json\"",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

