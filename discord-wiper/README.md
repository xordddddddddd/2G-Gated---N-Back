# Discord Wiper

A small web app that deletes **your own** Discord messages from a specific server (and optionally a single channel). It runs entirely in your browser; your user token is never stored — it is only relayed through a same-origin proxy route to call Discord's API (this is the only way to avoid CORS, since Discord blocks browser-origin `Authorization` requests).

## Read this first

- Using a **user token** to automate actions on your account is a "self-bot" and may violate Discord's Terms of Service. Discord rarely enforces this for personal cleanup tools, but accounts can be flagged in theory. Use at your own risk.
- Never share your user token. Anyone with it has full access to your Discord account.
- Deletions are permanent. Always do a **Dry run** first.

## How it works

1. You paste your Discord user token into the page.
2. The page lists your servers via `GET /users/@me/guilds`.
3. You pick a server (and optionally a single channel).
4. It searches your messages via `GET /guilds/:id/messages/search?author_id=...`, pages backwards using `max_id`, and deletes each result via `DELETE /channels/:id/messages/:id`.
5. Rate-limit headers (`retry-after`, `x-ratelimit-*`) are honored automatically; you can also slide the delay between deletes.

The server-side route at `app/api/discord/route.ts` forwards requests to `https://discord.com/api/v9{path}` with the `Authorization` header you supply. Only a small allow-list of paths is accepted by the proxy.

## Getting your user token

1. Open Discord in your browser and press **F12** to open DevTools.
2. Switch to the **Network** tab and filter for `/api`.
3. Send a message in any chat to trigger a request.
4. Open one of the requests, scroll to **Request Headers**, find `authorization`, and copy its value.

## Run locally

```bash
cd discord-wiper
npm install
npm run dev
# open http://localhost:3000
```

## Deploy

This is a stock Next.js App Router project — push the `discord-wiper/` directory to Vercel and it will build. No environment variables required.

## Limits & quirks

- The Discord search index can return HTTP 202 while it (re)builds; the app retries automatically.
- Search returns a maximum of 25 results per page. The app pages backwards using `max_id` to walk the full history.
- Pinned messages and most system messages (joins, boosts, etc.) are skipped — they cannot be deleted via this API.
- DM messages are not handled by this UI (the server picker requires a guild).
