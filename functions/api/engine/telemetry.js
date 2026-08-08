export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    
    if (!data.interactions || !Array.isArray(data.interactions)) {
      return new Response(JSON.stringify({ error: "Invalid payload: interactions array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Database configuration missing" }), { status: 500 });
    }

    const stmts = [];
    for (const interaction of data.interactions) {
      const id = interaction.id || crypto.randomUUID();
      const session_id = interaction.session_id || 'unknown';
      const generation_id = interaction.generation_id || null;
      const strategy_id = interaction.strategy_id || null;
      const object_id = interaction.object_id || null;
      const interaction_type = interaction.interaction_type || 'UNKNOWN';
      const industry = interaction.industry || null;
      const edited = interaction.edited ? 1 : 0;
      const exported = interaction.exported ? 1 : 0;
      const deleted = interaction.deleted ? 1 : 0;
      const time_since_generation = interaction.time_since_generation || null;

      stmts.push(
        env.DB.prepare(`
          INSERT INTO object_interactions 
          (id, session_id, generation_id, strategy_id, object_id, interaction_type, industry, edited, exported, deleted, time_since_generation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, session_id, generation_id, strategy_id, object_id, interaction_type, industry, edited, exported, deleted, time_since_generation)
      );
    }

    if (stmts.length > 0) {
      await env.DB.batch(stmts);
    }

    return new Response(JSON.stringify({ success: true, count: stmts.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error in telemetry endpoint:', error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
