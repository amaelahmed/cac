const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'x-admin-bypass': 'true' });
  await page.goto('https://main.cac-web-app.pages.dev/admin/knowledge');
  // wait for data to load
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'admin_knowledge.png' });
  await browser.close();
})();
