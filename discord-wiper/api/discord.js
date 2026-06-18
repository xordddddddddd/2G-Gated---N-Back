/*
 * Optional CORS-bypass proxy for the Discord API.
 *
 * The user's token is sent via the `x-discord-token` request header (never via the
 * URL) and is forwarded straight to Discord. This function does NOT log, store, or
 * inspect the token in any way — it's a thin pass-through.
 *
 * Use only when the browser can't talk to discord.com directly. Self-hosting this
 * proxy means *you* are the one accepting that token in transit; if you deploy it,
 * make sure your platform doesn't log request headers.
 */

const DISCORD_BASE = "https://discord.com/api/v9";

export default async function handler(req, res) {
  // Reflect CORS for same-origin browser clients of this proxy.
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type,x-discord-token");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const token = req.headers["x-discord-token"];
  const path = typeof req.query.path === "string" ? req.query.path : "";

  if (!token) {
    res.status(400).json({ error: "Missing x-discord-token header" });
    return;
  }
  if (!path.startsWith("/")) {
    res.status(400).json({ error: "Missing or invalid path query parameter" });
    return;
  }

  // Defence-in-depth: only allow paths that touch the API surface we actually use.
  // (search messages, fetch self, delete message)
  const allowed = [
    /^\/users\/@me(\?|$)/,
    /^\/guilds\/\d+\/messages\/search(\?|$)/,
    /^\/channels\/\d+\/messages\/search(\?|$)/,
    /^\/channels\/\d+\/messages\/\d+$/,
  ];
  if (!allowed.some((re) => re.test(path))) {
    res.status(403).json({ error: "Path not permitted by proxy", path });
    return;
  }

  const url = `${DISCORD_BASE}${path}`;
  const init = {
    method: req.method,
    headers: {
      authorization: token,
      "content-type": "application/json",
      "user-agent": "discord-wiper-proxy/1.0",
    },
  };

  if (req.method !== "GET" && req.method !== "DELETE") {
    // Vercel parses JSON bodies into req.body automatically.
    if (req.body && Object.keys(req.body).length > 0) {
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }
  }

  let upstream;
  try {
    upstream = await fetch(url, init);
  } catch (err) {
    res.status(502).json({ error: "Upstream fetch failed", detail: String(err && err.message || err) });
    return;
  }

  // Pass through status + retry-after so the client's rate-limit handling still works.
  res.status(upstream.status);
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) res.setHeader("retry-after", retryAfter);

  if (upstream.status === 204) {
    res.end();
    return;
  }

  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
  res.setHeader("content-type", contentType);
  res.send(text);
}
