import { getRequestSession, isPaidUser } from "../utils/auth";

export async function onRequestGet(context) {
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

        // 2. Fetch history from D1
        // Do not return the massive strategy_json blob for the list view, just metadata
        const { results } = await env.DB.prepare(
            `SELECT id, business_name, business_type, location, created_at 
             FROM strategies 
             WHERE uid = ? 
             ORDER BY created_at DESC`
        ).bind(uid).all();

        return new Response(JSON.stringify({ success: true, reports: results || [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in /api/reports (GET):', error);
        return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
