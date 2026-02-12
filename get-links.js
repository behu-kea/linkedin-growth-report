const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2] || path.join(__dirname, "posts.html");
const outputPath = path.join(__dirname, "post-links.json");

// Check if input file exists
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Error: posts.html not found at ${inputPath}`);
  console.error("Please run 'npm run download-html' first");
  process.exit(1);
}

const html = fs.readFileSync(inputPath, "utf8");

// Extract links using both specific pattern and fallback regex
const links = new Set();

// Primary method: Look for links with the specific analytics class and href pattern
// This targets: <a href="/feed/update/urn:li:activity:XXXXX/" class="... member-analytics-addon__mini-update-item">
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

// Fallback: if the primary regex found no links, use broader pattern
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

const output = Array.from(links);

if (output.length === 0) {
  console.error(
    "❌ No post links found in posts.html. Make sure it contains your analytics page.",
  );
  process.exit(1);
}

output.forEach((link) => console.log(link));

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n✓ Extracted ${output.length} unique post links`);
