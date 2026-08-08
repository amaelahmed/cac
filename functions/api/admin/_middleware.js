import { createAuth } from '../utils/auth';

export async function onRequest(context) {
  const { request, env, next } = context;

  // Initialize auth
  const auth = createAuth(env, new URL(request.url).origin);

  // Get session
  const sessionData = await auth.api.getSession({ headers: request.headers });

  if (!sessionData || !sessionData.session || !sessionData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check admin authorization
  const userEmail = sessionData.user.email?.toLowerCase();
  
  // 1. Check ADMIN_EMAILS if defined
  // 2. Fallback to ALLOWED_EMAILS
  const adminEmailsRaw = env.ADMIN_EMAILS || env.ALLOWED_EMAILS || '';
  const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase());
  
  if (!userEmail || !adminEmails.includes(userEmail)) {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Inject user info into context for downstream handlers (like audit logs)
  context.data = context.data || {};
  context.data.user = sessionData.user;

  return next();
}
