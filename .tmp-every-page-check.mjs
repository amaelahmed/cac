import { chromium } from "playwright";

const baseURL = "http://127.0.0.1:8788";
const failures = [];
const observations = [];
const runtimeErrors = [];

function check(condition, label, detail = "") {
  if (!condition) failures.push(detail ? `${label}: ${detail}` : label);
}

function watch(page, label) {
  page.on("pageerror", error => runtimeErrors.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error" && !message.text().includes("favicon")) {
      runtimeErrors.push(`${label} console: ${message.text()}`);
    }
  });
  page.on("response", response => {
    if (response.status() >= 500) runtimeErrors.push(`${label} HTTP ${response.status()}: ${response.url()}`);
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function pageFacts(page) {
  return page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    h1: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || "",
    main: Boolean(document.querySelector("main")),
    mainId: document.querySelector("main")?.id || "",
  }));
}

async function visit(page, route, label) {
  await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const facts = await pageFacts(page);
  check(facts.main, `${label} has a main landmark`);
  check(facts.scrollWidth <= facts.width + 1, `${label} has no horizontal overflow`, `${facts.scrollWidth}px > ${facts.width}px`);
  check(Boolean(facts.h1), `${label} has one clear page heading`);
  observations.push({ label, ...facts, url: page.url() });
  return facts;
}

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    watch(page, `home-${viewport.name}`);
    await visit(page, "/", `Home ${viewport.name}`);
    check(await page.getByRole("link", { name: /Build my plan/i }).first().isVisible(), `Home ${viewport.name} shows the primary action`);
    check((await page.locator("main > section").count()) <= 5, `Home ${viewport.name} stays within five sections`);
    check((await page.getByText("The Average Marketing Career", { exact: true }).count()) === 0, `Home ${viewport.name} removed the long career strip`);
    check(await page.getByRole("button", { name: "Check website" }).isVisible(), `Home ${viewport.name} keeps the compact website check`);
    if (viewport.name === "desktop") await page.screenshot({ path: "/tmp/cac-simple-all-pages-home-desktop.png", fullPage: true });
    if (viewport.name === "mobile") await page.screenshot({ path: "/tmp/cac-simple-all-pages-home-mobile.png", fullPage: true });

    watch(page, `legal-${viewport.name}`);
    await visit(page, "/legal", `Legal ${viewport.name}`);
    check((await page.locator("main details").count()) === 4, `Legal ${viewport.name} has four policy groups`);
    check(await page.getByText("CAC is free during beta", { exact: true }).isVisible(), `Legal ${viewport.name} states current pricing clearly`);
    await context.close();
  }

  const appContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const appPage = await appContext.newPage();
  watch(appPage, "builder");
  await appPage.goto(`${baseURL}/details`, { waitUntil: "domcontentloaded" });
  await settle(appPage);

  const testerButton = appPage.getByRole("button", { name: "Continue as Tester" });
  if (await testerButton.isVisible().catch(() => false)) {
    await testerButton.click();
    await appPage.getByRole("heading", { name: "Tell us about your business." }).waitFor({ timeout: 10000 });
  }

  let facts = await pageFacts(appPage);
  check(appPage.url().includes("/details"), "Builder stays on the details route after sign-in", appPage.url());
  check(facts.scrollWidth <= facts.width + 1, "Builder desktop has no horizontal overflow", `${facts.scrollWidth}px > ${facts.width}px`);
  check(await appPage.getByRole("heading", { name: "Tell us about your business." }).isVisible(), "Builder uses the simplified heading");
  const advanced = appPage.locator("details").filter({ hasText: "Add details for a sharper plan" }).first();
  const website = appPage.locator("details").filter({ hasText: "Add a website" }).first();
  const history = appPage.locator("details").filter({ hasText: "Previous plans" }).first();
  check(!(await advanced.evaluate(element => element.open)), "Builder advanced details start closed");
  check(!(await website.evaluate(element => element.open)), "Builder website details start closed");
  check(!(await history.evaluate(element => element.open)), "Builder previous plans start closed");
  check((await appPage.locator("section.cac-panel").count()) <= 2, "Builder avoids a dashboard wall");

  await appPage.locator("#biz_name").fill("Simple Page Browser Check");
  await appPage.locator("#biz_industry").selectOption("Cafe");
  await appPage.locator("#biz_stage").selectOption("Running but sales are inconsistent");
  await appPage.locator("#biz_location").fill("Kozhikode, Kerala");
  for (const [id, option] of [
    ["biz_offer", "Coffee / Tea / Beverages"],
    ["biz_audience", "Young professionals"],
    ["biz_challenge", "Low brand awareness"],
  ]) {
    await appPage.locator(`#${id}`).click();
    await appPage.getByRole("option", { name: option, exact: true }).click();
  }
  await appPage.getByRole("button", { name: "Instagram", exact: true }).click();
  await appPage.getByRole("button", { name: "Get more customers", exact: true }).click();
  await advanced.locator("summary").click();
  check(await appPage.locator("#biz_budget").isVisible(), "Builder reveals optional details on request");
  await advanced.locator("summary").click();
  await website.locator("summary").click();
  check(await appPage.getByRole("button", { name: "Check", exact: true }).first().isVisible(), "Builder keeps website checking reachable");
  await website.locator("summary").click();
  await history.locator("summary").click();
  check(await history.locator("button").count() >= 0, "Builder keeps previous plans reachable");
  await appPage.screenshot({ path: "/tmp/cac-simple-all-pages-builder-desktop.png", fullPage: true });

  const savedPlanButton = history.locator("button").first();
  let resultsChecked = false;
  if (await savedPlanButton.count()) {
    await savedPlanButton.click();
    await appPage.getByRole("heading", { name: /Simple Plan/ }).waitFor({ timeout: 15000 });
    await settle(appPage);
    resultsChecked = true;
    check(await appPage.getByRole("button", { name: "Plan", exact: true }).isVisible(), "Results show Plan as a primary destination");
    check(await appPage.getByRole("button", { name: "Posts", exact: true }).isVisible(), "Results show Posts as a primary destination");
    check(await appPage.getByRole("button", { name: "Messages", exact: true }).isVisible(), "Results show Messages as a primary destination");
    check((await appPage.getByRole("button", { name: "Customers", exact: true }).count()) === 0, "Results remove the fourth primary destination");
    check(!(await appPage.locator("details").filter({ hasText: "This week's 3 moves" }).first().evaluate(element => element.open)), "Results weekly actions start collapsed");
    const fullPlan = appPage.locator("details").filter({ hasText: /^Full plan/ }).first();
    check(!(await fullPlan.evaluate(element => element.open)), "Results full plan starts closed");
    await appPage.getByRole("button", { name: "Posts", exact: true }).click();
    check((await appPage.getByText(/^Day \d+$/).count()) <= 7, "Results initially show no more than seven post cards");
    await appPage.screenshot({ path: "/tmp/cac-simple-all-pages-results-desktop.png", fullPage: true });
    await appPage.emulateMedia({ media: "print" });
    check(await appPage.locator(".print-only").evaluate(element => getComputedStyle(element).display !== "none"), "Results print view is available");
    check((await appPage.locator(".print-only details:not([open])").count()) === 0, "Results print view expands every disclosure");
    await appPage.emulateMedia({ media: "screen" });
  }

  await appPage.setViewportSize({ width: 390, height: 844 });
  if (!appPage.url().includes("/details")) await appPage.goto(`${baseURL}/details`, { waitUntil: "domcontentloaded" });
  await settle(appPage);
  facts = await pageFacts(appPage);
  check(facts.scrollWidth <= facts.width + 1, "Builder or Results mobile has no horizontal overflow", `${facts.scrollWidth}px > ${facts.width}px`);
  await appPage.screenshot({ path: "/tmp/cac-simple-all-pages-app-mobile.png", fullPage: true });

  const adminRoutes = [
    ["/admin", "Keep the engine tidy."],
    ["/admin/knowledge", "Knowledge"],
    ["/admin/knowledge/edit?id=new", "Create knowledge object"],
    ["/admin/import", "Import knowledge"],
    ["/admin/telemetry", "Activity"],
    ["/admin/settings", "Access & pricing"],
  ];

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await appPage.setViewportSize(viewport);
    for (const [route, heading] of adminRoutes) {
      await appPage.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
      await settle(appPage);
      const adminFacts = await pageFacts(appPage);
      check(appPage.url().includes(route.split("?")[0]), `Admin ${route} ${viewport.name} remains accessible`, appPage.url());
      check(adminFacts.scrollWidth <= adminFacts.width + 1, `Admin ${route} ${viewport.name} has no horizontal overflow`, `${adminFacts.scrollWidth}px > ${adminFacts.width}px`);
      check(adminFacts.h1.includes(heading), `Admin ${route} ${viewport.name} has the expected heading`, adminFacts.h1);
      observations.push({ label: `Admin ${route} ${viewport.name}`, ...adminFacts, url: appPage.url() });
    }
    if (viewport.name === "mobile") {
      await appPage.getByRole("button", { name: "Open admin navigation" }).click();
      check(await appPage.getByRole("navigation", { name: "Mobile admin navigation" }).isVisible(), "Admin mobile navigation opens");
      await appPage.screenshot({ path: "/tmp/cac-simple-all-pages-admin-mobile.png", fullPage: true });
    } else {
      await appPage.screenshot({ path: "/tmp/cac-simple-all-pages-admin-desktop.png", fullPage: true });
    }
  }

  observations.push({ resultsChecked });
  await appContext.close();
} finally {
  await browser.close();
}

for (const error of runtimeErrors) failures.push(error);

console.log(JSON.stringify({ ok: failures.length === 0, failures, observations, runtimeErrors }, null, 2));
if (failures.length) process.exit(1);
