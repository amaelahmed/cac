export async function onRequestGet(context) {
  const { env } = context;
  return new Response(JSON.stringify({
    paymentsEnabled: env.ENABLE_PAYWALL === 'true',
    razorpayKeyId: env.RAZORPAY_KEY_ID || null,
    amountInPaise: 79900,
    currency: 'INR'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
