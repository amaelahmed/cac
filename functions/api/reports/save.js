import { getRequestSession, isPaidUser } from "../utils/auth";

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        
        // 1. Verify Authentication
        const session = await getRequestSession(env, request);
        
        if (!session || !session.user) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const hasPaid = await isPaidUser(env, session.user);
        if (!hasPaid) {
            return new Response(JSON.stringify({ success: false, error: "Access Denied. Please purchase a license.", code: "PAYMENT_REQUIRED" }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const uid = session.user.id;

        // 2. Parse payload
        const body = await request.json();
        const { bizName, bizType, location, website, data } = body;
        
        if (!data) {
             return new Response(JSON.stringify({ success: false, error: "Strategy data is required." }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Generate UUID for the report
        const strategyId = crypto.randomUUID();
        const storageData = {
            business: data.business,
            scores: data.scores,
            tabs: data.tabs,
            meta: data.meta,
        };
        const strategyJson = JSON.stringify(storageData);

        // 4. Insert into D1
        await env.DB.prepare(
            `INSERT INTO strategies (id, uid, business_name, business_type, location, website, strategy_json) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(strategyId, uid, bizName || '', bizType || '', location || '', website || '', strategyJson).run();

        return new Response(JSON.stringify({ success: true, id: strategyId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in /api/reports/save:', error);
        return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
