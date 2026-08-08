import { getLocalTesterSession, isLocalTesterAuthEnabled } from "./utils/auth";

export async function onRequestGet(context) {
  const { env, request } = context;
  const session = getLocalTesterSession(env, request);

  return new Response(JSON.stringify({
    enabled: isLocalTesterAuthEnabled(env, request),
    session
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
