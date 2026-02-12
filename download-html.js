const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { chromium } = require("playwright");

const storageStatePath = path.join(__dirname, "linkedin.auth.json");
const outputPath = path.join(__dirname, "posts.html");

const headless = process.env.HEADLESS === "true";
const slowMo = Number(process.env.SLOW_MO || 0);

const prompt = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, () => {
      rl.close();
      resolve();
    });
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureStorageState = async (browser) => {
  if (fs.existsSync(storageStatePath)) return;

  console.log("\n📱 Opening LinkedIn login...\n");
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
  });

  // Inject a persistent message on the page
  await page.addInitScript(() => {
    const banner = document.createElement("div");
    banner.id = "scraper-banner";
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #10b981;
      color: white;
      padding: 16px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    banner.innerHTML = `
      ✅ Log in to LinkedIn, then return to your terminal and press <strong>ENTER</strong>
    `;
    document.body.prepend(banner);
  });

  await prompt(
    "\n✅ Log in to LinkedIn in the browser window.\n   Once logged in, return to this terminal and press ENTER...\n",
  );

  await context.storageState({ path: storageStatePath });
  await context.close();
  console.log("✓ Session saved\n");
};

const downloadAnalyticsHtml = async (page) => {
  const analyticsUrl =
    "https://www.linkedin.com/analytics/creator/top-posts/?endDate=2026-02-12&metricType=IMPRESSIONS&startDate=2025-02-13&timeRange=past_365_days";

  console.log("📊 Fetching your posts analytics page...\n");

  // LinkedIn's analytics page is heavy; use 'load' instead of 'networkidle'
  // to avoid timeouts from background requests
  await page.goto(analyticsUrl, {
    waitUntil: "load",
    timeout: 60000, // 60 second timeout for slow connections
  });

  // Wait for the analytics post list to be visible and populated
  try {
    await page.waitForSelector(
      "ul.member-analytics-addon-analytics-object-list li a.member-analytics-addon__mini-update-item",
      { timeout: 15000 },
    );
  } catch (e) {
    console.warn(
      "⚠️  Analytics list may not have loaded, but continuing anyway...\n",
    );
  }

  // Additional wait to ensure dynamically loaded content settles
  await page.waitForTimeout(3000);

  const html = await page.content();
  return html;
};

const run = async () => {
  const browser = await chromium.launch({ headless, slowMo });

  try {
    await ensureStorageState(browser);

    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();

    const html = await downloadAnalyticsHtml(page);

    fs.writeFileSync(outputPath, html);
    console.log(`✓ Downloaded posts HTML to ${outputPath}\n`);

    await context.close();
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
