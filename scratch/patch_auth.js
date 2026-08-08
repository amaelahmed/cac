const fs = require('fs');
const path = 'functions/api/utils/auth.js';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('basePath')) {
  content = content.replace(
    'baseURL: env.BETTER_AUTH_URL || origin || "https://main.cac-web-app.pages.dev",',
    `baseURL: env.BETTER_AUTH_URL || origin || "https://main.cac-web-app.pages.dev",
    basePath: "/api/auth",`
  );
  fs.writeFileSync(path, content);
  console.log("Patched auth.js");
} else {
  console.log("Already patched");
}
