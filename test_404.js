const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.route('**/api/auth/**', route => {
    if (route.request().url().includes('get-session')) {
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          session: { id: "test", userId: "admin", expiresAt: new Date(Date.now() + 1000000).toISOString() },
          user: { id: "admin", email: "admin@example.com", name: "Admin" }
        })
      });
    } else { route.continue(); }
  });
  await context.route('**/api/admin/**', route => {
    const headers = route.request().headers();
    headers['x-admin-bypass'] = 'true';
    route.continue({ headers });
  });

  const page = await context.newPage();
  page.on('response', response => {
    if (response.status() === 404) {
      console.log(`[404] ${response.url()}`);
    }
  });

  await page.goto('https://main.cac-web-app.pages.dev/admin/knowledge');
  await page.waitForTimeout(2000);
  await browser.close();
})();
