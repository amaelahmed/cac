export async function onRequestPost(context) {
  const isSecure = new URL(context.request.url).protocol === "https:";
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `cac_local_tester=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`
    }
  });
}
