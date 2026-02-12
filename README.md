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


1. When the browser opens linkedin log in
2. After log in go to the terminal and press enter

**When done**

3. Open your LLM of choice (Mistral, ChatGPT, DeepSeek, Claude)
4. Start a new chat with the contents of `prompt.md`
5. Attach `posts-data.json` 

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

## Authentication & Security

The tool stores your LinkedIn session in `linkedin.auth.json` after first login. Subsequent runs won't require logging in again.

**Note:** Do not commit `linkedin.auth.json` to version control—it's automatically excluded via `.gitignore`.

## Requirements

- Node.js 16+
- Modern browser (Chromium/Chrome)
- LinkedIn account

