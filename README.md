# LinkedIn Post Scraper

Easily scrape data from your best performing LinkedIn posts including text, images, engagement metrics (likes, comments, reposts), impressions, and posting time.

## Setup

1. Clone/download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Simply run:

```bash
npm run start
```

The tool will:

1. **Open a browser window** - Log in to LinkedIn (one-time setup)
   - The browser window will open automatically
   - You'll see a **green message in the terminal** telling you what to do
   - Once logged in, **look back at your terminal and press Enter**
2. Navigate to your analytics page and download your posts HTML
3. Extract all post links from your analytics
4. Scrape detailed data from each post (this takes a few minutes)
5. Save everything to `posts-data.json` and `post-links.json`

### After Running

Once complete, you'll have:

- ✅ **`posts-data.json`** - All your post data with engagement metrics
- ✅ **`prompt.md`** - A ChatGPT-compatible analysis template

**Next step:** Get AI-powered insights on your content performance (see "AI Analysis" below)

## AI Analysis: Get Insights from Your Posts

Use the included `prompt.md` template to analyze your posts with ChatGPT:

1. Open [ChatGPT](https://chat.openai.com)
2. Copy the contents of `prompt.md`
3. Paste it at the beginning of a new conversation
4. Copy-paste your `posts-data.json` file contents
5. Ask: "Analyze my LinkedIn posts and provide insights"

You'll get:

- Engagement analysis
- Content performance patterns
- Audience psychology insights
- Specific recommendations on what works
- Ideas for future posts tailored to your audience

This tool does the scraping; ChatGPT does the analysis. Together they tell you exactly what content resonates with your audience.

## How it Works

### `npm run start`

Main entry point that orchestrates the entire pipeline:

- Downloads HTML from your LinkedIn analytics page
- Extracts post links
- Scrapes each post for data
- Generates `posts-data.json`

### Individual Commands

If you need to run steps separately:

- **Download HTML only:**

  ```bash
  npm run download-html
  ```

  Saves to `posts.html`

- **Extract links only:**

  ```bash
  npm run get-links
  ```

  Saves to `post-links.json`

- **Scrape posts only:**
  ```bash
  npm run scrape-posts
  ```
  Requires `post-links.json` and saves to `posts-data.json`

## Output

`posts-data.json` contains an array of posts with:

- **link** - URL to the post
- **activityId** - LinkedIn's internal activity ID
- **postText** - Full text of your post
- **timeOfDay** - When you posted it
- **imageUrl** - URL to post image (if present)
- **hasImage** - Boolean indicating if post has an image
- **likes** - Number of reactions
- **comments** - Number of comments
- **reposts** - Number of reposts/shares
- **impressions** - Number of impressions from analytics

## Authentication & Security

The tool stores your LinkedIn session in `linkedin.auth.json` after first login. Subsequent runs won't require logging in again.

**Note:** Do not commit `linkedin.auth.json` to version control—it's automatically excluded via `.gitignore`.

### You'll see this flow:

```
🚀 LinkedIn Post Scraper

Step 1: Downloading your posts analytics page
This will open a browser window for you to log in...

📱 Opening LinkedIn login...

✅ Please log in to LinkedIn in the browser window, then press Enter here to continue...
```

👉 **Look at the browser window that opened, log in, then come back to the terminal and press Enter.**

## Requirements

- Node.js 16+
- Modern browser (Chromium/Chrome)
- LinkedIn account

## Troubleshooting

**Browser window is minimized** - The browser might be behind other windows. Check your taskbar or use Alt+Tab to find it.

**"No links found"** - Make sure posts.html contains your analytics page HTML. Try deleting posts.html and running again.

**Wrong post text** - The scraper may pick up comment text instead of post text. Try re-running the scraper.

**Login issues** - Delete `linkedin.auth.json` and run `npm run start` again to re-authenticate.
