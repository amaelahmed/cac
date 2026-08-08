const fs = require('fs');
const path = 'functions/api/[[route]].js';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('debug-auth')) {
  content = content.replace(
    'return await auth.handler(context.request);',
    `
        if (requestUrl.pathname.includes('debug-auth')) {
            return new Response(JSON.stringify({
                url: context.request.url,
                method: context.request.method,
                origin: requestUrl.origin,
                betterAuthBase: env.BETTER_AUTH_URL || requestUrl.origin || "fallback"
            }), { status: 200 });
        }
        return await auth.handler(context.request);`
  );
  fs.writeFileSync(path, content);
  console.log("Patched [[route]].js");
} else {
  console.log("Already patched");
}
