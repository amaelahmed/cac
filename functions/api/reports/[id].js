import { getRequestSession, isPaidUser } from "../utils/auth";

export async function onRequestGet(context) {
    try {
        const { request, env, params } = context;
        const reportId = params.id;
        
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

        // 2. Fetch specific report, strictly enforcing ownership (uid = ?)
        const report = await env.DB.prepare(
            `SELECT * FROM strategies WHERE id = ? AND uid = ?`
        ).bind(reportId, uid).first();

        if (!report) {
            return new Response(JSON.stringify({ success: false, error: "Report not found or unauthorized access" }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, report: report }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in /api/reports/:id (GET):', error);
        return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
