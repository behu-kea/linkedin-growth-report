const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const postsHtmlPath = path.join(__dirname, "posts.html");
const postsDataPath = path.join(__dirname, "posts-data.json");

const step = (num, message) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step ${num}: ${message}`);
  console.log("=".repeat(60) + "\n");
};

const run = async () => {
  console.log("\n🚀 LinkedIn Post Scraper\n");

  // Step 1: Download HTML
  if (!fs.existsSync(postsHtmlPath)) {
    step(1, "Downloading your posts analytics page");
    console.log("This will open a browser window for you to log in...\n");
    try {
      execSync("node download-html.js", { stdio: "inherit" });
    } catch (error) {
      console.error(
        "\n❌ Failed to download HTML. Please try again or download manually.",
      );
      process.exit(1);
    }
  } else {
    console.log("✓ posts.html already exists, skipping download\n");
  }

  // Step 2: Scrape posts
  step(2, "Scraping posts");
  console.log("This will take a few minutes. Scraping one post at a time...\n");
  try {
    execSync("node scrape-posts.js", { stdio: "inherit" });
  } catch (error) {
    console.error("\n❌ Failed to scrape posts");
    process.exit(1);
  }

  // Summary
  step(4, "Done!");
  if (fs.existsSync(postsDataPath)) {
    const data = JSON.parse(fs.readFileSync(postsDataPath, "utf8"));
    console.log(`✅ Successfully scraped ${data.length} posts!\n`);
    console.log(`📄 Results saved to: ${path.basename(postsDataPath)}\n`);

    const withImages = data.filter((p) => p.hasImage).length;
    const avgLikes =
      Math.round(
        data.reduce((sum, p) => sum + (p.likes || 0), 0) / data.length,
      ) || 0;
    const avgImpressions =
      Math.round(
        data.reduce((sum, p) => sum + (p.impressions || 0), 0) / data.length,
      ) || 0;

    console.log("📊 Summary:");
    console.log(`   • Total posts: ${data.length}`);
    console.log(`   • Posts with images: ${withImages}`);
    console.log(`   • Average likes: ${avgLikes}`);
    console.log(`   • Average impressions: ${avgImpressions}`);
    console.log("");

    // ChatGPT analysis workflow
    console.log("\n" + "=".repeat(60));
    console.log("🤖 GET AI-POWERED INSIGHTS");
    console.log("=".repeat(60));
    console.log(
      "\nUse ChatGPT to analyze your content and get personalized insights:\n",
    );
    console.log("1. Open your LLM of choice");
    console.log("2. Copy contents of prompt.md (analysis template)");
    console.log("3. Paste it into your LLM");
    console.log("4. Attach your posts-data.json file");
    console.log("5. Ask your LLM to analyze your posts using thinking mode");
    console.log(
      "\nYou'll get engagement analysis, patterns, and tailored recommendations!\n",
    );
    console.log("=".repeat(60) + "\n");
  }
};

run().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
