#!/usr/bin/env node
/**
 * Discord Message Wiper — local server.
 *
 * Does two things:
 *   1. Serves the static front-end from ./public
 *   2. Acts as a thin proxy to the Discord API so the browser can talk to it
 *      (the browser cannot call discord.com directly because of CORS).
 *
 * The proxy is deliberately dumb: it forwards one request at a time and copies
 * the Authorization token straight through. The token is NEVER written to disk
 * and NEVER logged. Everything runs on your own machine.
 *
 * Run with:  node server.js   (Node 18+ required for global fetch)
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = process.env.PORT || 5174;
const DISCORD_API = "https://discord.com/api/v10";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * Forward a request to the Discord API.
 * Body shape: { method, path, token, body }
 */
async function handleProxy(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const { method = "GET", path, token, body } = payload;

  if (!token || typeof token !== "string") {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Missing Discord token" }));
    return;
  }
  if (!path || typeof path !== "string" || !path.startsWith("/")) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid Discord API path" }));
    return;
  }

  const url = DISCORD_API + path;
  const init = {
    method,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (DiscordMessageWiper, local privacy tool, +https://github.com)",
    },
  };
  if (body !== undefined && method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify(body);
  }

  try {
    const dres = await fetch(url, init);
    const text = await dres.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    // Surface the rate-limit info the front-end needs to pace itself.
    const out = {
      status: dres.status,
      retryAfter: Number(dres.headers.get("retry-after")) || null,
      rateLimitRemaining: dres.headers.get("x-ratelimit-remaining"),
      rateLimitReset: dres.headers.get("x-ratelimit-reset-after"),
      data,
    };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  } catch (err) {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Proxy request failed", detail: String(err) }));
  }
}

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // Prevent path traversal.
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[extname(filePath)] || "application/octet-stream",
    });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end("<h1>404 — Not found</h1>");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/discord") {
    await handleProxy(req, res);
    return;
  }
  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log("\n  Discord Message Wiper is running.");
  console.log(`  Open  http://localhost:${PORT}  in your browser.\n`);
  console.log("  Your token stays on this machine. Press Ctrl+C to stop.\n");
});
