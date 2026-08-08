import * as jose from 'jose';

// Fetch Google Public Keys as JWKS
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

const PROJECT_ID = 'cancelagencyculture';

export async function verifyAuth(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: { message: "Unauthorized. Please sign in." } }, 401);
  }
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    
    // Pass user details to Hono context
    c.set('user', { uid: payload.user_id || payload.sub, email: payload.email, paid: true });
    
    await next();
  } catch (error) {
    console.error('[AUTH LOG] Secure Verification Failure:', error.message);
    return c.json({ error: { message: "Unauthorized. Invalid or forged token." } }, 401);
  }
}

export async function verifyAuthNoPaywall(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    
    c.set('user', { uid: payload.user_id || payload.sub, email: payload.email });
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}
