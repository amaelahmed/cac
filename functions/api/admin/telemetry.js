export async function onRequestGet(context) {
  const { env } = context;

  try {
    // 1. Most Generated Objects
    const topGeneratedStmt = env.DB.prepare(`
      SELECT 
        o.object_id, 
        k.domain_id, 
        k.industry_id,
        COUNT(*) as count
      FROM object_interactions o
      JOIN knowledge_objects k ON o.object_id = k.id
      WHERE o.interaction_type = 'GENERATED'
      GROUP BY o.object_id
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // 2. Most Edited Objects
    const topEditedStmt = env.DB.prepare(`
      SELECT 
        o.object_id, 
        k.domain_id, 
        COUNT(*) as count
      FROM object_interactions o
      JOIN knowledge_objects k ON o.object_id = k.id
      WHERE o.interaction_type = 'EDITED'
      GROUP BY o.object_id
      ORDER BY count DESC
      LIMIT 10
    `);

    // 3. Most Exported Objects
    const topExportedStmt = env.DB.prepare(`
      SELECT 
        o.object_id, 
        k.domain_id,
        COUNT(*) as count
      FROM object_interactions o
      JOIN knowledge_objects k ON o.object_id = k.id
      WHERE o.interaction_type = 'EXPORTED'
      GROUP BY o.object_id
      ORDER BY count DESC
      LIMIT 10
    `);

    // 4. Regeneration Frequency
    const regenStmt = env.DB.prepare(`
      SELECT 
        o.object_id, 
        COUNT(*) as count
      FROM object_interactions o
      WHERE o.interaction_type = 'REGENERATED'
      GROUP BY o.object_id
      ORDER BY count DESC
      LIMIT 10
    `);

    // 5. Total counts
    const totalStatsStmt = env.DB.prepare(`
      SELECT 
        COUNT(*) as total_objects,
        (SELECT COUNT(*) FROM object_interactions WHERE interaction_type = 'GENERATED') as total_generations,
        (SELECT COUNT(*) FROM object_interactions WHERE interaction_type = 'EDITED') as total_edits,
        (SELECT COUNT(*) FROM object_interactions WHERE interaction_type = 'EXPORTED') as total_exports
      FROM knowledge_objects
    `);

    const [
      { results: topGenerated },
      { results: topEdited },
      { results: topExported },
      { results: topRegenerated },
      { results: totalStatsRaw }
    ] = await env.DB.batch([
      topGeneratedStmt,
      topEditedStmt,
      topExportedStmt,
      regenStmt,
      totalStatsStmt
    ]);

    const totalStats = totalStatsRaw[0] || { total_objects: 0, total_generations: 0, total_edits: 0, total_exports: 0 };

    return new Response(JSON.stringify({
      topGenerated,
      topEdited,
      topExported,
      topRegenerated,
      totalStats
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
