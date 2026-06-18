# Discord Message Wiper

A Next.js web app that lets you delete **your own** Discord messages from specific servers you choose. It uses Discord's official OAuth2 flow — no pasting user tokens.

## Features

- Sign in with Discord (OAuth2)
- Browse servers on your account and select which ones to clean
- Deletes only messages you authored
- Live progress via server-sent events
- Configurable delays to reduce rate limiting
- Falls back to per-channel scanning if guild search is unavailable

## Setup

### 1. Create a Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. Open **OAuth2** and add a redirect URL:
   - Local: `http://localhost:3000/api/auth/callback`
   - Production: `https://your-domain.com/api/auth/callback`
4. Copy the **Client ID** and **Client Secret**

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `DISCORD_CLIENT_ID` | OAuth client ID from the Developer Portal |
| `DISCORD_CLIENT_SECRET` | OAuth client secret |
| `SESSION_SECRET` | Random string, at least 32 characters (encrypts session cookies) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (e.g. `http://localhost:3000`) |

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy (Vercel)

Set the root directory to `discord-cleaner` in your Vercel project settings, or deploy from this folder directly:

```bash
cd discord-cleaner
vercel
```

Add the same environment variables in the Vercel dashboard and update the OAuth redirect URL to match your production domain.

## Important notes

- **Irreversible** — deleted messages cannot be recovered.
- **Rate limits** — Discord throttles bulk deletions. Large message histories can take hours. Increase the delay settings if you hit rate limits often.
- **Scope** — Only your messages are deleted. Messages in channels you cannot access are skipped.
- **OAuth scopes used:** `identify`, `guilds`, `guilds.channels.read`

## Tech stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- iron-session for encrypted cookies
- Discord REST API v10
