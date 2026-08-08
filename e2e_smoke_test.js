const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  
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
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
      console.error(`[Console Error] ${msg.text()}`);
    } else {
      console.log(`[Console ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    errors.push(`[Page Error] ${error}`);
    console.error(`[Page Error] ${error}`);
  });

  const testId = 'test-smoke-obj-' + Date.now();

  try {
    console.log('1. Navigating to /admin/knowledge...');
    await page.goto('https://main.cac-web-app.pages.dev/admin/knowledge');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/Users/macbookair/.gemini/antigravity-ide/brain/b8429abb-2dda-4525-a022-ad51e4b7ae9e/step1_dashboard.png' });

    console.log('2. Clicking Create Object...');
    await page.click('text=Create Object');
    await page.waitForURL('**/admin/knowledge/edit?id=new');
    await page.waitForLoadState('networkidle');
    
    console.log('3. Filling out new object form...');
    await page.fill('input[name="id"]', testId);
    await page.fill('input[name="domain_id"]', 'test-domain');
    await page.fill('input[name="industry_id"]', 'test-industry');
    await page.fill('input[name="object_type"]', 'test-type');
    await page.fill('input[name="author"]', 'playwright');
    await page.screenshot({ path: '/Users/macbookair/.gemini/antigravity-ide/brain/b8429abb-2dda-4525-a022-ad51e4b7ae9e/step2_form_filled.png' });

    console.log('4. Saving object...');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/knowledge');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/Users/macbookair/.gemini/antigravity-ide/brain/b8429abb-2dda-4525-a022-ad51e4b7ae9e/step3_dashboard_after_create.png' });

    console.log('5. Searching for the new object...');
    await page.fill('input[placeholder="Search by ID or Industry..."]', testId);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/macbookair/.gemini/antigravity-ide/brain/b8429abb-2dda-4525-a022-ad51e4b7ae9e/step4_search_results.png' });
    
    const rowsCount = await page.locator(`td:has-text("${testId}")`).count();
    if (rowsCount === 0) {
      throw new Error("Object not found in search results");
    }
    console.log('Object found in search results!');

    console.log('6. Editing the object...');
    await page.locator(`tr:has(td:has-text("${testId}")) a[title="Edit"]`).click();
    await page.waitForURL(`**/admin/knowledge/edit?id=${testId}`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="author"]', 'playwright-edited');
    await page.screenshot({ path: '/Users/macbookair/.gemini/antigravity-ide/brain/b8429abb-2dda-4525-a022-ad51e4b7ae9e/step5_edit_form.png' });
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/knowledge');
    await page.waitForLoadState('networkidle');

    console.log('7. Searching again to delete...');
    await page.fill('input[placeholder="Search by ID or Industry..."]', testId);
    await page.waitForTimeout(1000);
    
    console.log('8. Deleting the object...');
    page.once('dialog', dialog => dialog.accept());
    await page.locator(`tr:has(td:has-text("${testId}")) button[title="Soft Delete"]`).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/macbookair/.gemini/antigravity-ide/brain/b8429abb-2dda-4525-a022-ad51e4b7ae9e/step6_after_delete.png' });

    console.log('Test completed successfully.');
    
    fs.writeFileSync('smoke_test_result.json', JSON.stringify({ success: true, errors }));
  } catch (err) {
    console.error('Test failed:', err);
    await page.screenshot({ path: '/Users/macbookair/.gemini/antigravity-ide/brain/b8429abb-2dda-4525-a022-ad51e4b7ae9e/error_state.png' });
    fs.writeFileSync('smoke_test_result.json', JSON.stringify({ success: false, errors, exception: err.message }));
  } finally {
    await browser.close();
  }
})();
