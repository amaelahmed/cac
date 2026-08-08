import { chromium } from 'playwright';

(async () => {
  console.log("Starting test...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:3001...");
  await page.goto('http://localhost:3001');
  
  // Wait for React to mount and hydrate
  await page.waitForTimeout(2000);

  // 1. Log theme before click
  const htmlClassBefore = await page.evaluate(() => document.documentElement.className);
  const themeValueBefore = await page.evaluate(() => window.localStorage.getItem('theme'));
  console.log("Before click:");
  console.log("  HTML class:", htmlClassBefore);
  console.log("  localStorage theme:", themeValueBefore);

  // Get computed background color of body
  const bodyBgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log("  Body bg color:", bodyBgBefore);

  // 2. Click the toggle button
  console.log("\nClicking theme toggle button...");
  await page.click('button[aria-label="Toggle theme"]');
  
  // Wait a bit for state to update and transition to apply
  await page.waitForTimeout(1000);

  // 3. Log theme after click
  const htmlClassAfter = await page.evaluate(() => document.documentElement.className);
  const themeValueAfter = await page.evaluate(() => window.localStorage.getItem('theme'));
  console.log("After click:");
  console.log("  HTML class:", htmlClassAfter);
  console.log("  localStorage theme:", themeValueAfter);
  
  const bodyBgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log("  Body bg color:", bodyBgAfter);

  // 4. Check if theme toggle button icon changed (Sun/Moon)
  const buttonHtml = await page.evaluate(() => document.querySelector('button[aria-label="Toggle theme"]').innerHTML);
  console.log("  Button HTML (contains SVG):", buttonHtml.includes('svg'));

  await browser.close();
})();
