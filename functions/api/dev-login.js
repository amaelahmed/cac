import { isLocalTesterAuthEnabled } from "./utils/auth";

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!isLocalTesterAuthEnabled(env, request)) {
    return new Response(JSON.stringify({ error: "Local tester auth is not enabled." }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  const isSecure = new URL(request.url).protocol === "https:";

  return new Response(JSON.stringify({
    success: true,
    user: {
      id: "local-tester",
      email: "tester@manual-test.cac",
      name: "Manual Tester"
    }
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `cac_local_tester=active; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isSecure ? "; Secure" : ""}`
    }
  });
}
