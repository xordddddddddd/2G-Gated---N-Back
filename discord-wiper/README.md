# Discord Message Wiper

A small web app that deletes **your own** Discord messages from a specific **server** or **DM**, with optional filters (text contains, date range, has link, has attachment).

It's a Next.js app: a React UI plus a tiny same-origin proxy route that forwards
requests to the Discord API (needed only to get around browser CORS). Your token is
passed straight through to Discord and is **never stored, logged, or persisted**.

---

## ⚠️ Read this first

Discord has **no official feature or API** for bulk-deleting your own messages. To do
it, this tool automates your user account — which Discord calls "self-botting."

- **Automating a user account violates [Discord's Terms of Service](https://discord.com/terms)
  and can get your account suspended or banned.**
- **Deletions are permanent.** There is no undo.
- Use the slowest delete speed you can tolerate, only on your own account, and **at your own risk.**

This project is not affiliated with or endorsed by Discord.

---

## How it works

1. You paste your Discord **user token**. The app calls `users/@me` to identify you and
   loads your servers and DMs.
2. You pick a **server** (uses Discord's message search to find your messages) or a **DM**
   (pages through the channel history), plus any optional filters.
3. The app repeatedly finds your messages and deletes them one by one
   (`DELETE /channels/{id}/messages/{id}`), respecting Discord rate limits (it backs off
   on HTTP 429 using `retry_after`).

Only messages authored by you, of a user-deletable type, are deleted. The proxy is
locked to a small whitelist of Discord endpoints so it can't be used as a general relay.

## Getting your token

In the Discord **web** client: open DevTools (F12) → **Network** tab → refresh →
click a request to `discord.com/api` → copy the value of the `authorization` request
header. Treat this like your password.

## Run locally

```bash
cd discord-wiper
npm install
npm run dev
# open http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Deploy to Vercel

Deploy this **subdirectory** as its own Vercel project:

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to `discord-wiper`.
3. Framework preset: **Next.js** (auto-detected). No environment variables required.

> The repository root is a separate Vite app; keep this app's root directory set to
> `discord-wiper` so the two don't collide.

## Privacy

- The token lives only in your browser tab's memory and in each request you make. Close
  the tab and it's gone.
- The proxy route (`app/api/discord/[...path]/route.ts`) forwards your request to Discord
  and returns the response. It does not write the token to logs, disk, cookies, or any
  database.

## Tech

- Next.js 15 (App Router) + React 19 + TypeScript
- No external runtime dependencies beyond Next/React
