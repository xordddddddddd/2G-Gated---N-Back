# 🧹 Discord Message Wiper

A small, local-first web tool to **delete your own messages from a specific Discord server**.
No build step, no dependencies — just Node.

---

## ⚠️ Important — please read

- **This uses your account token to act as you.** Automating a user account is against
  [Discord's Terms of Service](https://discord.com/terms) and could, in theory, get your account
  actioned. You are using this at your own risk.
- It can **only delete messages you wrote.** It cannot touch anyone else's messages.
- **Deletions are permanent — there is no undo.** Always run a **Dry run** first.
- Your token never leaves your machine: it lives in the browser tab and is forwarded only to
  Discord through a local proxy. It is **never logged or saved to disk**.
- **Never share your token.** It is equivalent to your password.

This exists because Discord provides no official way to bulk-delete your own messages, which is a
legitimate privacy need (your messages are your data). Use it responsibly.

---

## Run it locally (recommended)

You need [Node.js](https://nodejs.org/) **18 or newer**.

```bash
cd discord-message-wiper
npm start
```

Then open **http://localhost:5174** in your browser.

To stop the server, press `Ctrl+C`.

---

## How to use

1. Tick the acknowledgement box after reading the warnings.
2. Paste your Discord **user token** (see below) and click **Connect**.
3. Pick the **server** you want to clean up. Optionally narrow it down by channel, text,
   or date range.
4. Click **Dry run** to preview how many of your messages match — nothing is deleted yet.
5. If the preview looks right, click **Delete my messages** and confirm.
6. Watch the progress log. You can press **Stop** at any time.

### How to find your token

> Treat this like a password.

1. Open Discord in a **browser** (not the desktop app) and log in.
2. Press `F12` to open Developer Tools → **Network** tab.
3. Do something (send a message, switch channels) so requests show up.
4. Click any request to `discord.com/api`, open **Headers**, and copy the value of the
   `authorization` **request header**. That's your token.

---

## How it works

- `server.js` serves the front-end from `public/` and exposes a single `POST /api/discord`
  endpoint that forwards one request at a time to `https://discord.com/api/v10`. This is needed
  because browsers can't call the Discord API directly (CORS).
- The front-end (`public/app.js`) uses Discord's message **search** endpoint to find messages you
  authored in the chosen server, then deletes them one by one, honoring rate limits
  (`429` responses and a configurable delay between deletes).

### Rate limits

Discord limits how fast you can delete. The default delay is **1150 ms** between deletes, which is
safe. Lowering it goes faster but you'll hit `429`s more often (the tool waits them out
automatically). Large servers with thousands of messages can take a while — that's expected.

---

## Deploying to Vercel (optional)

The same front-end works on Vercel using the serverless proxy in `api/discord.js`.

> ⚠️ A public deployment means anyone who finds the URL can use your proxy as a relay to Discord
> (they'd still need their own token). For a personal privacy tool, **running it locally is
> strongly preferred.**

If you do deploy, point Vercel at this `discord-message-wiper/` directory as the project root.

---

## License

Provided as-is for personal use. Not affiliated with or endorsed by Discord.
