export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    const url = new URL(request.url);
    const object_id = url.searchParams.get('object_id');
    const limit = url.searchParams.get('limit') || 100;

    let query = 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?';
    let bindParams = [limit];

    if (object_id) {
      query = 'SELECT * FROM audit_logs WHERE object_id = ? ORDER BY created_at DESC LIMIT ?';
      bindParams = [object_id, limit];
    }

    const { results } = await env.DB.prepare(query).bind(...bindParams).all();
    
    return new Response(JSON.stringify(results), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
