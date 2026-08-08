export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    if (id) {
      const stmt = env.DB.prepare('SELECT * FROM knowledge_objects WHERE id = ?').bind(id);
      const result = await stmt.first();
      
      if (!result) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      
      // Fetch relationships
      const relsStmt = env.DB.prepare('SELECT * FROM ko_relationships WHERE source_id = ? OR target_id = ?').bind(id, id);
      const { results: relationships } = await relsStmt.all();
      
      return new Response(JSON.stringify({ ...result, relationships }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // List all
    const stmt = env.DB.prepare('SELECT id, domain_id, industry_id, object_type, review_status, author, created_at, updated_at FROM knowledge_objects ORDER BY updated_at DESC');
    const { results } = await stmt.all();

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const userEmail = context.data?.user?.email || 'system';
  try {
    const data = await request.json();
    
    // Basic validation
    if (!data.id || !data.domain_id || !data.industry_id || !data.object_type || !data.author || !data.content_json) {
       return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Validate JSON and placeholders
    try {
      JSON.parse(data.content_json);
      if (data.placeholders) JSON.parse(data.placeholders);
      if (data.tags) JSON.parse(data.tags);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in content_json, placeholders, or tags' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const version = data.version || '1.0.0';
    const review_status = data.review_status || 'Draft';
    
    // 1. Insert Object
    const stmtObj = env.DB.prepare(`
      INSERT INTO knowledge_objects (
        id, domain_id, industry_id, object_type, version, author, 
        review_status, base_confidence, tags, expected_output, placeholders,
        target_goal, target_audience, target_location, target_size, target_service,
        target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
        content_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).bind(
      data.id, data.domain_id, data.industry_id, data.object_type, version, data.author,
      review_status, data.base_confidence || 100, data.tags || '[]', data.expected_output || null, data.placeholders || '[]',
      data.target_goal || 'ANY', data.target_audience || 'ANY', data.target_location || 'ANY', data.target_size || 'ANY', data.target_service || 'ANY',
      data.target_stage || 'ANY', data.target_model || 'ANY', data.target_pricing || 'ANY', data.target_type || 'ANY', data.target_maturity || 'ANY', data.target_challenge || 'ANY',
      data.content_json
    );

    // 2. Insert Version History
    const stmtVer = env.DB.prepare(`
      INSERT INTO knowledge_object_versions (id, object_id, version, author, change_summary, content_json, placeholders, tags, target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), data.id, version, data.author, "Initial creation", data.content_json, data.placeholders || '[]', data.tags || '[]',
      data.target_goal || 'ANY', data.target_audience || 'ANY', data.target_location || 'ANY', data.target_size || 'ANY', data.target_service || 'ANY',
      data.target_stage || 'ANY', data.target_model || 'ANY', data.target_pricing || 'ANY', data.target_type || 'ANY', data.target_maturity || 'ANY', data.target_challenge || 'ANY'
    );

    // 3. Insert Audit Log
    const stmtAudit = env.DB.prepare(`INSERT INTO audit_logs (id, user_email, action, object_id, summary) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), userEmail, 'Create', data.id, `Created knowledge object ${data.id}`);

    await env.DB.batch([stmtObj, stmtVer, stmtAudit]);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 201, headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  const userEmail = context.data?.user?.email || 'system';
  try {
    const data = await request.json();
    
    if (!data.id) {
       return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!data.change_summary) {
       return new Response(JSON.stringify({ error: 'change_summary is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      if (data.content_json) JSON.parse(data.content_json);
      if (data.placeholders) JSON.parse(data.placeholders);
      if (data.tags) JSON.parse(data.tags);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Fetch existing for version history if not all fields are provided
    const existing = await env.DB.prepare('SELECT * FROM knowledge_objects WHERE id = ?').bind(data.id).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Build dynamic UPDATE query based on fields provided
    const fields = ['domain_id', 'industry_id', 'object_type', 'version', 'author', 'review_status', 'base_confidence', 'tags', 'expected_output', 'placeholders', 'target_goal', 'target_audience', 'target_location', 'target_size', 'target_service', 'target_stage', 'target_model', 'target_pricing', 'target_type', 'target_maturity', 'target_challenge', 'content_json'];
    
    let updates = [];
    let values = [];
    
    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }
    
    if (updates.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No changes' }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(data.id);
    
    const query = `UPDATE knowledge_objects SET ${updates.join(', ')} WHERE id = ?`;
    const stmtObj = env.DB.prepare(query).bind(...values);
    
    // Insert Version History
    const stmtVer = env.DB.prepare(`
      INSERT INTO knowledge_object_versions (id, object_id, version, author, change_summary, content_json, placeholders, tags, target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), 
      data.id, 
      data.version || existing.version, 
      data.author || existing.author, 
      data.change_summary, 
      data.content_json || existing.content_json, 
      data.placeholders !== undefined ? data.placeholders : existing.placeholders, 
      data.tags !== undefined ? data.tags : existing.tags,
      data.target_goal || existing.target_goal, 
      data.target_audience || existing.target_audience, 
      data.target_location || existing.target_location, 
      data.target_size || existing.target_size, 
      data.target_service || existing.target_service,
      data.target_stage || existing.target_stage, 
      data.target_model || existing.target_model, 
      data.target_pricing || existing.target_pricing, 
      data.target_type || existing.target_type, 
      data.target_maturity || existing.target_maturity, 
      data.target_challenge || existing.target_challenge
    );

    // Audit Log Action determination
    let action = 'Edit';
    if (data.review_status === 'Published' && existing.review_status !== 'Published') action = 'Publish';
    else if (data.review_status === 'Archived' && existing.review_status !== 'Archived') action = 'Archive';

    // Insert Audit Log
    const stmtAudit = env.DB.prepare(`INSERT INTO audit_logs (id, user_email, action, object_id, summary) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), userEmail, action, data.id, data.change_summary);

    await env.DB.batch([stmtObj, stmtVer, stmtAudit]);

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const userEmail = context.data?.user?.email || 'system';
  const url = new URL(request.url);
  let id = url.searchParams.get('id');
  let hardDelete = url.searchParams.get('hard') === 'true';

  try {
    if (!id && request.headers.get('content-type')?.includes('application/json')) {
      const data = await request.json();
      id = data.id;
      if (data.hard === true) hardDelete = true;
    }
  } catch {
    // Ignore JSON parse errors here
  }

  try {
    if (!id) {
       return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (hardDelete) {
      const stmtRels = env.DB.prepare('DELETE FROM ko_relationships WHERE source_id = ? OR target_id = ?').bind(id, id);
      const stmtVers = env.DB.prepare('DELETE FROM knowledge_object_versions WHERE object_id = ?').bind(id);
      const stmtObj = env.DB.prepare('DELETE FROM knowledge_objects WHERE id = ?').bind(id);
      const stmtAudit = env.DB.prepare(`INSERT INTO audit_logs (id, user_email, action, object_id, summary) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), userEmail, 'Delete', id, `Hard deleted knowledge object ${id}`);
      
      await env.DB.batch([stmtRels, stmtVers, stmtObj, stmtAudit]);
    } else {
      // Soft delete by marking as Archived
      const stmtObj = env.DB.prepare("UPDATE knowledge_objects SET review_status = 'Archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id);
      const stmtAudit = env.DB.prepare(`INSERT INTO audit_logs (id, user_email, action, object_id, summary) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), userEmail, 'Archive', id, `Archived knowledge object ${id}`);
      
      await env.DB.batch([stmtObj, stmtAudit]);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
