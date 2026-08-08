import { createAuth } from "./utils/auth";

export async function onRequest(context) {
    try {
        const requestUrl = new URL(context.request.url);
        const auth = createAuth(context.env, requestUrl.origin);
        return await auth.handler(context.request);
    } catch (err) {
        return new Response(JSON.stringify({
            error: "Unhandled Error in Auth Handler",
            message: err.message
        }), { status: 500 });
    }
}
