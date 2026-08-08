export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    const url = new URL(request.url);
    const object_id = url.searchParams.get('object_id');

    if (!object_id) {
      return new Response(JSON.stringify({ error: 'object_id is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { results } = await env.DB.prepare('SELECT id, version, author, change_summary, created_at FROM knowledge_object_versions WHERE object_id = ? ORDER BY created_at DESC').bind(object_id).all();
    
    return new Response(JSON.stringify(results), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
