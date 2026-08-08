import { createAuth } from "./utils/auth";

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

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Payment gateway is not configured." }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const authString = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      body: JSON.stringify({
        amount: 79900,
        currency: "INR",
        receipt: `receipt_${session.user.id}`
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Razorpay error:", data);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return new Response(JSON.stringify({ error: "Failed to create order" }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
