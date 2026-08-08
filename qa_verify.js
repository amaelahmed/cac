const { chromium } = require('playwright');
const fs = require('fs');

async function verifyEnv(url) {
    const results = {};
    const browser = await chromium.launch({ headless: true });
    
    try {
        // 1. Onboarding Flow
        try {
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto(`${url}/details`);
            
            // Wait for button and click
            await page.waitForSelector('button:has-text("Get My Strategy")');
            await page.click('button:has-text("Get My Strategy")');
            
            // Check for error state
            await page.waitForTimeout(1000); // give it a sec to show validation
            const errorEls = await page.$$('.text-red-500');
            let errorText = 'No error text found';
            if (errorEls.length > 0) {
                errorText = await errorEls[0].innerText();
            }
            
            results.onboarding = { 
                has_validation: errorText !== 'No error text found', 
                error_text: errorText 
            };
            await context.close();
        } catch (e) {
            results.onboarding = { error: e.message };
        }

        // 2. Admin Knowledge Library Pagination
        try {
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto(`${url}/admin/knowledge`);
            await page.waitForSelector('table', { timeout: 5000 });
            
            const nextBtns = await page.$$('button:has-text("Next")');
            const searchInputs = await page.$$('input[placeholder*="Search"]');
            
            results.admin_library = { 
                has_pagination: nextBtns.length > 0, 
                has_search: searchInputs.length > 0 
            };
            await context.close();
        } catch (e) {
            results.admin_library = { error: e.message };
        }

        // 3. Knowledge Editor
        try {
            const context = await browser.newContext();
            const page = await context.newPage();
            // Goto edit page for a dummy ID so we can see the form
            await page.goto(`${url}/admin/knowledge/edit?id=new`);
            await page.waitForTimeout(2000);
            
            const summaryInputs = await page.$$('input[placeholder*="Summary"], textarea[placeholder*="Summary"], input[id="change-summary"]');
            const hasChangeSummary = summaryInputs.length > 0;
            
            results.admin_editor = { has_change_summary: hasChangeSummary };
            await context.close();
        } catch (e) {
            results.admin_editor = { error: e.message };
        }
    } finally {
        await browser.close();
    }
    return results;
}

(async () => {
    console.log("=== LOCAL (http://localhost:8788) ===");
    const local = await verifyEnv("http://localhost:8788");
    console.log(JSON.stringify(local, null, 2));

    console.log("\n=== PRODUCTION (https://main.cac-web-app.pages.dev) ===");
    const prod = await verifyEnv("https://main.cac-web-app.pages.dev");
    console.log(JSON.stringify(prod, null, 2));
})();
