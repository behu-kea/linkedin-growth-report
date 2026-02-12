# Personal LinkedIn Growth Advice

Get a personalized LinkedIn growth report that will help you improve your LinkedIn game 😎

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


## Authentication & Security

The tool stores your LinkedIn session in `linkedin.auth.json` after first login. Subsequent runs won't require logging in again.

**Note:** Do not commit `linkedin.auth.json` to version control—it's automatically excluded via `.gitignore`.

## Requirements

- Node.js 16+
- Modern browser (Chromium/Chrome)
- LinkedIn account

