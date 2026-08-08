import { betterAuth } from "better-auth";

function getCookie(headers, name) {
  const cookieHeader = headers.get('Cookie') || headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(part => part.trim());
  const match = cookies.find(part => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function isLocalRequest(request) {
  const origin = new URL(request.url).origin;
  const hostname = new URL(origin).hostname;
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

export function isLocalTesterAuthEnabled(env, request) {
  if (env.DISABLE_LOCAL_TEST_AUTH === 'true') return false;
  if (isLocalRequest(request)) {
    return env.DEV_AUTH_ENABLED === 'true' || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET;
  }

  const branch = String(env.CF_PAGES_BRANCH || '').toLowerCase();
  const isPreviewBranch = Boolean(env.CF_PAGES) && branch && branch !== 'production';
  return env.ENABLE_TESTER_LOGIN === 'true' && isPreviewBranch;
}

export function getLocalTesterSession(env, request) {
  if (!isLocalTesterAuthEnabled(env, request)) return null;
  const cookie = getCookie(request.headers, 'cac_local_tester');
  if (cookie !== 'active') return null;
  return {
    user: {
      id: 'local-tester',
      email: 'tester@manual-test.cac',
      name: 'Manual Tester'
    }
  };
}

export async function getRequestSession(env, request) {
  const auth = createAuth(env, new URL(request.url).origin);
  const session = await auth.api.getSession({ headers: request.headers });
  return session || getLocalTesterSession(env, request);
}

export function createAuth(env, origin) {
  const socialProviders = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  return betterAuth({
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL || origin || "https://main.cac-web-app.pages.dev",
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: false,
    },
    socialProviders,
    advanced: {
      // In Cloudflare Workers, we might need cross-subdomain cookies if the API is on a different domain, but here it's the same domain.
    }
  });
}

export async function isPaidUser(env, user) {
  // Open beta: keep the app usable for testers without wiring payments.
  // Set ENABLE_PAYWALL=true when paid access should be enforced again.
  if (env.ENABLE_PAYWALL !== 'true') {
    return true;
  }

  // 1. Check ALLOWED_EMAILS list
  const allowedEmailsRaw = env.ALLOWED_EMAILS || '';
  if (allowedEmailsRaw && user.email) {
    const allowedEmails = allowedEmailsRaw.split(',').map(e => e.trim().toLowerCase());
    if (allowedEmails.includes(user.email.toLowerCase())) {
      return true;
    }
  }

  // 2. Check if user exists in the transactions table (proof of payment)
  try {
    const result = await env.DB.prepare("SELECT COUNT(*) as count FROM transactions WHERE uid = ?").bind(user.id).first();
    if (result && result.count > 0) {
      return true;
    }
  } catch (error) {
    console.error("Error verifying payment status from D1:", error);
  }

  return false;
}
