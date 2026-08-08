import { createAuth } from "./utils/auth";

async function safeEqual(provided, expected) {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided || "")),
    crypto.subtle.digest("SHA-256", encoder.encode(expected || "")),
  ]);

  const providedBytes = new Uint8Array(providedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let diff = providedBytes.length ^ expectedBytes.length;

  for (let i = 0; i < expectedBytes.length; i++) {
    diff |= providedBytes[i] ^ expectedBytes[i];
  }

  return diff === 0;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const auth = createAuth(env, new URL(request.url).origin);
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const bodyJson = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = bodyJson;

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Payment gateway is not configured." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing payment verification fields." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent duplicate transactions using D1
    const existingTx = await env.DB.prepare("SELECT payment_id FROM transactions WHERE payment_id = ?")
      .bind(razorpay_payment_id).first();
    
    if (existingTx) {
      return new Response(JSON.stringify({ error: "Duplicate transaction detected." }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Verify signature
    const bodyStr = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyStr));
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (await safeEqual(razorpay_signature, signatureHex)) {
      // Fetch original order to verify ownership
      const authString = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
      const res = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { "Authorization": `Basic ${authString}` }
      });
      const order = await res.json();
      
      if (!order || order.receipt !== `receipt_${session.user.id}`) {
        console.warn(`[SECURITY LOG] Payment order mismatch/hijack attempt by user ${session.user.id}`);
        return new Response(JSON.stringify({ error: "Payment validation failed. This order does not belong to you." }), { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      // Mark as processed (Store transaction)
      await env.DB.prepare(
        "INSERT INTO transactions (payment_id, uid, order_id, amount) VALUES (?, ?, ?, ?)"
      ).bind(razorpay_payment_id, session.user.id, razorpay_order_id, order.amount).run();

      console.log(`[SECURITY LOG] Payment successful for user ${session.user.id}. Payment ID: ${razorpay_payment_id}`);
      return new Response(JSON.stringify({ success: true, message: "Payment verified successfully" }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    } else {
      console.warn(`[SECURITY LOG] Invalid payment signature for user ${session.user.id}`);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  } catch (error) {
    console.error("[SECURITY LOG] Error verifying payment:", error);
    return new Response(JSON.stringify({ error: "Failed to verify payment" }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
