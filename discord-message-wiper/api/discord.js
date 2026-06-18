/**
 * Vercel serverless proxy to the Discord API (optional deployment path).
 *
 * Mirrors the local server's /api/discord endpoint so the same front-end works
 * when deployed to Vercel. The token is forwarded straight through and is never
 * logged or persisted.
 *
 * Note: deploying this publicly means anyone who finds the URL could use your
 * proxy as a relay. For a personal privacy tool, running it locally with
 * `node server.js` is strongly recommended over a public deployment.
 */

const DISCORD_API = "https://discord.com/api/v10";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { method = "GET", path, token, body } = req.body || {};

  if (!token || typeof token !== "string") {
    res.status(401).json({ error: "Missing Discord token" });
    return;
  }
  if (!path || typeof path !== "string" || !path.startsWith("/")) {
    res.status(400).json({ error: "Invalid Discord API path" });
    return;
  }

  const init = {
    method,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (DiscordMessageWiper, privacy tool, +https://github.com)",
    },
  };
  if (body !== undefined && method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify(body);
  }

  try {
    const dres = await fetch(DISCORD_API + path, init);
    const text = await dres.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    res.status(200).json({
      status: dres.status,
      retryAfter: Number(dres.headers.get("retry-after")) || null,
      rateLimitRemaining: dres.headers.get("x-ratelimit-remaining"),
      rateLimitReset: dres.headers.get("x-ratelimit-reset-after"),
      data,
    });
  } catch (err) {
    res.status(502).json({ error: "Proxy request failed", detail: String(err) });
  }
}
