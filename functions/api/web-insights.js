import { getRequestSession } from "./utils/auth";
import { fetchWebSnapshot } from "./utils/web-fetch";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const session = await getRequestSession(env, request);

    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const snapshot = await fetchWebSnapshot(body.url, { maxTextLength: 4000 });

    return new Response(JSON.stringify({
      kind: body.kind === "competitor" ? "competitor" : "own",
      snapshot
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: { message: error.message || "Failed to inspect website." } }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
