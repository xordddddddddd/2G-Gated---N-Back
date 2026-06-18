# Discord Message Wiper

A small client-side website that deletes **your own** Discord messages from a
specific server (or a specific channel), with filters, dry-run mode, pause /
resume / stop controls, and proper rate-limit handling.

> [!CAUTION]
> Automating actions with a **user account token** is against
> [Discord's Terms of Service](https://discord.com/terms) (the "self-bot" rule),
> even when you're only deleting your own data. Accounts have been flagged or
> disabled for tools like this. **Use at your own risk.**

## What it does

- Verifies your Discord user token (`GET /users/@me`).
- Uses Discord's search API to find all messages **you** authored in a given
  server and/or channel.
- Deletes each match via `DELETE /channels/{channel_id}/messages/{message_id}`,
  with configurable delays and full handling of HTTP&nbsp;429 rate limits.
- Walks past Discord's 5,000-result offset cap by tightening `max_id` after each
  batch, so it can wipe arbitrarily large histories.
- Supports filters: text-contains, has-attachment, before/after dates.

## What it does NOT do

- It cannot delete messages written by other people.
- It cannot recover messages — deletions are permanent.
- It does not edit messages, leave servers, or touch anything else on your
  account.

## Security model

- Everything runs in your browser. No server is involved by default.
- Your token is held in JavaScript memory only. If you tick
  *"Remember token in this browser"*, it's stored in **sessionStorage**, which
  is wiped when you close the tab. It is never written to localStorage and
  never sent to any server other than `discord.com`.
- All requests go directly to `https://discord.com/api/v9` from your browser.
- An **optional** Vercel serverless proxy is included at
  [`api/discord.js`](./api/discord.js) for browsers that block Discord with
  CORS errors. If you tick the *"Route through Vercel proxy"* checkbox, your
  token is sent in an `x-discord-token` header to your own deployment of this
  app and forwarded to Discord. The proxy never logs the token, but you're
  trusting your hosting platform's request logging policy — review it before
  enabling.

## How to find your Discord user token

1. Open https://discord.com/app in your browser and sign in.
2. Press <kbd>F12</kbd> to open DevTools.
3. Switch to the **Network** tab.
4. Reload the page (don't close DevTools).
5. Filter requests by `api`, click any request to `discord.com/api`, and look
   at **Request Headers** → `authorization`. That value is your token.

Treat it like a password: anyone who has it can fully impersonate your account.

## How to find a Server ID or Channel ID

1. In Discord, open **Settings → Advanced** and enable **Developer Mode**.
2. Right-click a server icon → *Copy Server ID*, or right-click a channel →
   *Copy Channel ID*.

## Running it

### Option A — open the file locally

The page is a static `index.html` with one CSS file and one JS file. You can
literally double-click `index.html`, but most browsers will block `fetch` from
a `file://` origin. The easiest local server:

```bash
cd discord-wiper
python3 -m http.server 8000
# then open http://localhost:8000
```

(The optional proxy at `/api/discord` will not work in this mode; uncheck
*"Route through Vercel proxy"*.)

### Option B — deploy to Vercel

The `discord-wiper/` directory is a self-contained Vercel project — both
static frontend and the optional serverless proxy. From this directory:

```bash
npx vercel deploy --cwd discord-wiper
```

…or import it as a separate Vercel project pointing at the `discord-wiper/`
root. No build step or dependencies are required.

### Option C — any static host

Drop the three files (`index.html`, `styles.css`, `app.js`) on GitHub Pages,
Netlify, Cloudflare Pages, or any static host. The proxy will be unavailable;
direct Discord API calls usually work in modern browsers without it.

## How to use it

1. Paste your token, click **Verify token**.
2. Enter a **Server ID** (and optionally a **Channel ID** to narrow it down).
3. Pick any filters you want (contains text, dates, attachment-only, etc.).
4. Leave **Dry run** checked the first time and click **Start**. You'll see a
   preview of every message that would be deleted.
5. When the dry run looks right, uncheck *Dry run* and click **Start** again.
6. Use **Pause** / **Stop** at any time. Discord rate-limit responses are
   handled automatically — leave the default 1100 ms delete delay alone unless
   you know what you're doing.

## Tech

- Plain HTML / CSS / vanilla JS — no build step, no dependencies.
- Optional Vercel serverless function (`api/discord.js`) for CORS bypass.
- Snowflake math (Discord epoch = 1420070400000) for date filtering.

## License

MIT. No warranty. You are responsible for how you use this tool.
