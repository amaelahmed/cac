export async function onRequestPost(context) {
  const { env, request } = context;
  const userEmail = context.data?.user?.email || 'system';

  try {
    const data = await request.json();
    const { object_id, version_id } = data;

    if (!object_id || !version_id) {
      return new Response(JSON.stringify({ error: 'object_id and version_id are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Fetch the old version
    const versionRow = await env.DB.prepare('SELECT * FROM knowledge_object_versions WHERE id = ? AND object_id = ?').bind(version_id, object_id).first();
    if (!versionRow) {
      return new Response(JSON.stringify({ error: 'Version not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Fetch the current object to increment version correctly or just reuse the version we're rolling back to? Let's use the old version string but maybe append "-rollback".
    const existing = await env.DB.prepare('SELECT version FROM knowledge_objects WHERE id = ?').bind(object_id).first();
    if (!existing) {
       return new Response(JSON.stringify({ error: 'Object not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const newVersion = `${versionRow.version}-restored`;
    const changeSummary = `Rolled back to version ${versionRow.version} (ID: ${version_id})`;

    // 3. Update the main object
    const stmtObj = env.DB.prepare(`
      UPDATE knowledge_objects SET 
        content_json = ?, placeholders = ?, tags = ?, 
        target_goal = ?, target_audience = ?, target_location = ?, target_size = ?, 
        target_service = ?, target_stage = ?, target_model = ?, target_pricing = ?, 
        target_type = ?, target_maturity = ?, target_challenge = ?, 
        version = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      versionRow.content_json, versionRow.placeholders, versionRow.tags,
      versionRow.target_goal, versionRow.target_audience, versionRow.target_location, versionRow.target_size,
      versionRow.target_service, versionRow.target_stage, versionRow.target_model, versionRow.target_pricing,
      versionRow.target_type, versionRow.target_maturity, versionRow.target_challenge,
      newVersion, object_id
    );

    // 4. Create new version history entry
    const stmtVer = env.DB.prepare(`
      INSERT INTO knowledge_object_versions (id, object_id, version, author, change_summary, content_json, placeholders, tags, target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), object_id, newVersion, userEmail, changeSummary, versionRow.content_json, versionRow.placeholders, versionRow.tags,
      versionRow.target_goal, versionRow.target_audience, versionRow.target_location, versionRow.target_size, versionRow.target_service,
      versionRow.target_stage, versionRow.target_model, versionRow.target_pricing, versionRow.target_type, versionRow.target_maturity, versionRow.target_challenge
    );

    // 5. Create audit log
    const stmtAudit = env.DB.prepare(`INSERT INTO audit_logs (id, user_email, action, object_id, summary) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), userEmail, 'Rollback', object_id, changeSummary);

    await env.DB.batch([stmtObj, stmtVer, stmtAudit]);

    return new Response(JSON.stringify({ success: true, version: newVersion }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
