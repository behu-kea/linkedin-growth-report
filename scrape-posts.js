const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { chromium } = require("playwright");

const htmlPath = process.argv[2] || path.join(__dirname, "posts.html");
const outputPath = process.argv[3] || path.join(__dirname, "posts-data.json");
const storageStatePath = path.join(__dirname, "linkedin.auth.json");

const headless = process.env.HEADLESS === "true";
const slowMo = Number(process.env.SLOW_MO || 0);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const toNumber = (value) => {
  if (!value) return null;
  const text = String(value).replace(/,/g, "").trim();
  const match = text.match(/(\d+(?:\.\d+)?)([KMB])?/i);
  if (!match) return null;
  const number = Number(match[1]);
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") return Math.round(number * 1000);
  if (suffix === "M") return Math.round(number * 1000000);
  if (suffix === "B") return Math.round(number * 1000000000);
  return Math.round(number);
};

const getActivityId = (url) => {
  const match = url.match(/activity:(\d+)/);
  return match ? match[1] : null;
};

const ensureStorageState = async (browser) => {
  if (fs.existsSync(storageStatePath)) return;

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
  });

  await prompt(
    "Log in in the browser window, then press Enter here to continue...",
  );

  await context.storageState({ path: storageStatePath });
  await context.close();
};

const scrapePost = async (page, url, activityId) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const data = await page.evaluate((activityIdValue) => {
    const parseNumber = (value) => {
      if (!value) return null;
      const text = String(value).replace(/,/g, "").trim();
      const match = text.match(/(\d+(?:\.\d+)?)([KMB])?/i);
      if (!match) return null;
      const number = Number(match[1]);
      const suffix = (match[2] || "").toUpperCase();
      if (suffix === "K") return Math.round(number * 1000);
      if (suffix === "M") return Math.round(number * 1000000);
      if (suffix === "B") return Math.round(number * 1000000000);
      return Math.round(number);
    };

    const root = document.querySelector("main") || document.body;
    const activitySelector = activityIdValue
      ? `[data-urn*="activity:${activityIdValue}"]`
      : null;
    const activityEl = activitySelector
      ? root.querySelector(activitySelector)
      : null;
    const postContainer =
      activityEl?.closest("article") ||
      activityEl?.closest("div.feed-shared-update-v2") ||
      root.querySelector("div.feed-shared-update-v2") ||
      root.querySelector("article") ||
      root;

    const isInComments = (el) =>
      Boolean(
        el.closest(
          "div.comments-comments-list, div.comment, div.comments-comment-item, div.comments-comment-item__main-content, section.comments, div.feed-shared-update-v2__comments-container, div.update-components-comments",
        ),
      );

    const primarySelectors = [
      "div.update-components-text",
      "div.update-components-text-view",
      "div.feed-shared-update-v2__commentary",
      "div.feed-shared-update-v2__description",
      "div.feed-shared-update-v2__description-wrapper",
      "[data-test-id='main-feed-activity-card__commentary']",
    ];

    const primaryCandidates = Array.from(
      postContainer.querySelectorAll(primarySelectors.join(", ")),
    ).filter((el) => !isInComments(el));

    const fallbackCandidates = Array.from(
      postContainer.querySelectorAll("span.break-words"),
    ).filter((el) => !isInComments(el));

    const chooseBest = (elements) =>
      elements
        .map((el) => el.innerText?.trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)[0] || null;

    const postText =
      chooseBest(primaryCandidates) || chooseBest(fallbackCandidates);

    const timeElement =
      postContainer.querySelector("time") || root.querySelector("time");
    const timeOfDay =
      timeElement?.getAttribute("datetime") || timeElement?.innerText || null;

    const ariaTimeElement = Array.from(
      postContainer.querySelectorAll("[aria-label]"),
    )
      .map((el) => ({
        el,
        label: el.getAttribute("aria-label") || "",
      }))
      .find(({ label }) => /posted on|posted|published/i.test(label));

    const timeLabel = ariaTimeElement?.label || null;

    const imageCandidates = Array.from(
      postContainer.querySelectorAll(
        "img.feed-shared-image__image, img.update-components-image__image, img.ivm-view-attr__img--centered, img",
      ),
    ).filter((img) => {
      const alt = (img.getAttribute("alt") || "").toLowerCase();
      if (alt.includes("profile") || alt.includes("avatar")) return false;
      const src =
        img.getAttribute("src") || img.getAttribute("data-delayed-url");
      return Boolean(src);
    });

    const imageUrl =
      imageCandidates.length > 0
        ? imageCandidates[0].getAttribute("src") ||
          imageCandidates[0].getAttribute("data-delayed-url")
        : null;

    const getCountFromAria = (pattern) => {
      const element = Array.from(
        postContainer.querySelectorAll("[aria-label]"),
      ).find((el) => pattern.test(el.getAttribute("aria-label") || ""));
      const label = element?.getAttribute("aria-label");
      return parseNumber(label);
    };

    const likes =
      parseNumber(
        postContainer
          .querySelector(".social-details-social-counts__reactions-count")
          ?.textContent?.trim(),
      ) || getCountFromAria(/reactions|likes/i);

    const comments = getCountFromAria(/comments?/i);
    const reposts = getCountFromAria(/reposts?|repost/i);

    return {
      postText,
      timeOfDay: timeOfDay || timeLabel,
      imageUrl,
      hasImage: Boolean(imageUrl),
      likes,
      comments,
      reposts,
    };
  }, activityId);

  return data;
};

const scrapeImpressions = async (page, activityId) => {
  if (!activityId) return null;
  const analyticsUrl = `https://www.linkedin.com/analytics/post-summary/urn:li:activity:${activityId}`;

  await page.goto(analyticsUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  return page.evaluate(() => {
    const parseNumber = (value) => {
      if (!value) return null;
      const text = String(value).replace(/,/g, "").trim();
      const match = text.match(/(\d+(?:\.\d+)?)([KMB])?/i);
      if (!match) return null;
      const number = Number(match[1]);
      const suffix = (match[2] || "").toUpperCase();
      if (suffix === "K") return Math.round(number * 1000);
      if (suffix === "M") return Math.round(number * 1000000);
      if (suffix === "B") return Math.round(number * 1000000000);
      return Math.round(number);
    };

    const textMatch = document.body.innerText.match(
      /([0-9.,]+\s*[KMB]?)\s+Impressions/i,
    );

    if (textMatch) {
      return parseNumber(textMatch[1]);
    }

    const label = Array.from(document.querySelectorAll("span, div")).find(
      (el) => el.textContent?.trim().toLowerCase() === "impressions",
    );

    if (label) {
      const container =
        label.closest("li, div, section") || label.parentElement;
      const numberEl = container
        ? Array.from(container.querySelectorAll("span, div")).find((el) =>
            /\d/.test(el.textContent || ""),
          )
        : null;
      return parseNumber(numberEl?.textContent);
    }

    return null;
  });
};

const extractLinksFromHtml = (html) => {
  const links = new Set();

  // Primary: Extract links with the analytics class
  const analyticsLinkRegex =
    /class="[^"]*member-analytics-addon__mini-update-item[^"]*"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="[^"]*member-analytics-addon__mini-update-item/gi;

  let match;
  while ((match = analyticsLinkRegex.exec(html)) !== null) {
    const href = match[1] || match[2];
    if (!href) continue;

    if (href.includes("/feed/update/urn:li:activity:")) {
      const normalized = href.startsWith("http")
        ? href
        : `https://www.linkedin.com${href}`;
      const activityMatch = normalized.match(/activity:(\d+)/);
      if (!activityMatch) continue;
      const canonical = `https://www.linkedin.com/feed/update/urn:li:activity:${activityMatch[1]}/`;
      links.add(canonical);
    }
  }

  // Fallback: if primary didn't find links, use broader regex
  if (links.size === 0) {
    const hrefRegex = /href\s*=\s*"([^"]+)"/gi;

    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      if (!href) continue;

      if (href.includes("/feed/update/urn:li:activity:")) {
        const normalized = href.startsWith("http")
          ? href
          : `https://www.linkedin.com${href}`;
        const activityMatch = normalized.match(/activity:(\d+)/);
        if (!activityMatch) continue;
        const canonical = `https://www.linkedin.com/feed/update/urn:li:activity:${activityMatch[1]}/`;
        links.add(canonical);
      }
    }
  }

  return Array.from(links);
};

const run = async () => {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found at ${htmlPath}`);
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const links = extractLinksFromHtml(html);
  if (!Array.isArray(links) || links.length === 0) {
    throw new Error("No post links found in posts.html");
  }

  const browser = await chromium.launch({ headless, slowMo });
  await ensureStorageState(browser);

  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  const results = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const activityId = getActivityId(link);
    process.stdout.write(
      `\r📝 Scraping post ${i + 1}/${links.length}... (${Math.round(((i + 1) / links.length) * 100)}%)`,
    );

    const postData = await scrapePost(page, link, activityId);
    const impressions = await scrapeImpressions(page, activityId);

    results.push({
      link,
      activityId,
      ...postData,
      impressions,
    });

    await sleep(1000);
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  await context.close();
  await browser.close();

  console.log(`\n✓ Saved ${results.length} posts to ${outputPath}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
