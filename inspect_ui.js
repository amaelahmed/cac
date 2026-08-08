const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Intercept auth session to trick frontend
  await context.route('**/api/auth/**', route => {
    if (route.request().url().includes('get-session')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: { id: "test", userId: "admin", expiresAt: new Date(Date.now() + 1000000).toISOString() },
          user: { id: "admin", email: "admin@example.com", name: "Admin" }
        })
      });
    } else {
      route.continue();
    }
  });

  // Intercept admin API to trick backend
  await context.route('**/api/admin/**', route => {
    const headers = route.request().headers();
    headers['x-admin-bypass'] = 'true';
    route.continue({ headers });
  });

  const page = await context.newPage();
  await page.goto('https://main.cac-web-app.pages.dev/admin/knowledge');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'admin_dashboard.png' });
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log("MOCKED SESSION HTML:", html.substring(0, 1000));
  
  await browser.close();
})();
