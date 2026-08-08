const fs = require('fs');
const path = 'functions/api/[[route]].js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
    'return response;',
    `
        if (response.status === 404) {
            const clone = context.request.clone();
            return new Response(JSON.stringify({
                error: "better-auth returned 404",
                reqUrl: clone.url,
                method: clone.method,
                headers: Object.fromEntries(clone.headers.entries()),
                authBase: context.env.BETTER_AUTH_URL || requestUrl.origin
            }), { status: 404 });
        }
        return response;`
);
fs.writeFileSync(path, content);
