/*
 * Discord Message Wiper — client-side logic.
 *
 * The token only ever travels from the user's browser to either:
 *   (a) https://discord.com/api/v9 directly, OR
 *   (b) the optional same-origin /api/discord proxy (which forwards to Discord without logging).
 *
 * Nothing here is persisted to localStorage by default; sessionStorage is opt-in.
 */

const DISCORD_API = "https://discord.com/api/v9";
const PROXY_API = "/api/discord";

const $ = (id) => document.getElementById(id);

const els = {
  token: $("token"),
  toggleToken: $("toggleToken"),
  remember: $("remember"),
  verify: $("verify"),
  me: $("me"),
  guildId: $("guildId"),
  channelId: $("channelId"),
  contains: $("contains"),
  hasAttachment: $("hasAttachment"),
  afterDate: $("afterDate"),
  beforeDate: $("beforeDate"),
  delay: $("delay"),
  searchDelay: $("searchDelay"),
  dryRun: $("dryRun"),
  useProxy: $("useProxy"),
  start: $("start"),
  pause: $("pause"),
  stop: $("stop"),
  statFound: $("statFound"),
  statDeleted: $("statDeleted"),
  statSkipped: $("statSkipped"),
  statFailed: $("statFailed"),
  statRate: $("statRate"),
  progressBar: $("progressBar"),
  log: $("log"),
};

const state = {
  running: false,
  paused: false,
  cancelled: false,
  userId: null,
  totalEstimate: 0,
  found: 0,
  deleted: 0,
  skipped: 0,
  failed: 0,
  rate: 0,
};

// ---------- persistence (sessionStorage, opt-in) ----------

const SESSION_KEY = "discord-wiper:token";

function restoreToken() {
  try {
    const t = sessionStorage.getItem(SESSION_KEY);
    if (t) {
      els.token.value = t;
      els.remember.checked = true;
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

function persistTokenIfRequested() {
  try {
    if (els.remember.checked) {
      sessionStorage.setItem(SESSION_KEY, els.token.value);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

// ---------- logging / stats ----------

function log(message, level = "info") {
  const line = document.createElement("span");
  line.className = `line ${level === "info" ? "" : level}`;
  const ts = new Date().toLocaleTimeString();
  line.textContent = `[${ts}] ${message}`;
  els.log.appendChild(line);
  els.log.scrollTop = els.log.scrollHeight;
}

function renderStats() {
  els.statFound.textContent = state.found;
  els.statDeleted.textContent = state.deleted;
  els.statSkipped.textContent = state.skipped;
  els.statFailed.textContent = state.failed;
  els.statRate.textContent = state.rate;

  const handled = state.deleted + state.skipped + state.failed;
  const total = Math.max(state.found, state.totalEstimate, handled);
  const pct = total > 0 ? Math.min(100, (handled / total) * 100) : 0;
  els.progressBar.style.width = `${pct}%`;
}

function resetStats() {
  state.totalEstimate = 0;
  state.found = 0;
  state.deleted = 0;
  state.skipped = 0;
  state.failed = 0;
  state.rate = 0;
  renderStats();
  els.log.textContent = "";
}

// ---------- Discord API wrapper ----------

async function discordFetch(method, endpoint, { token, query, body, useProxy } = {}) {
  let url;
  let headers = { "content-type": "application/json" };

  if (useProxy) {
    const qs = new URLSearchParams(query || {}).toString();
    url = `${PROXY_API}?path=${encodeURIComponent(endpoint + (qs ? "?" + qs : ""))}`;
    // The proxy reads the user's token from this header so it never appears in URLs/logs.
    headers["x-discord-token"] = token;
  } else {
    const qs = new URLSearchParams(query || {}).toString();
    url = `${DISCORD_API}${endpoint}${qs ? "?" + qs : ""}`;
    headers["authorization"] = token;
  }

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  return res;
}

async function discordJson(method, endpoint, opts) {
  const res = await discordFetch(method, endpoint, opts);
  let json = null;
  if (res.status !== 204) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  }
  return { ok: res.ok, status: res.status, json, retryAfter: res.headers.get("retry-after") };
}

// ---------- helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function snowflakeFromDate(dateString) {
  if (!dateString) return null;
  const ms = new Date(dateString).getTime();
  if (Number.isNaN(ms)) return null;
  const discordEpoch = 1420070400000n;
  const id = (BigInt(ms) - discordEpoch) << 22n;
  return id.toString();
}

function passesClientFilter(message, filters) {
  if (filters.contains) {
    const text = (message.content || "").toLowerCase();
    if (!text.includes(filters.contains.toLowerCase())) return false;
  }
  if (filters.attachment === "with" && (!message.attachments || message.attachments.length === 0)) return false;
  if (filters.attachment === "without" && message.attachments && message.attachments.length > 0) return false;
  return true;
}

async function waitWhilePaused() {
  while (state.paused && !state.cancelled) {
    await sleep(150);
  }
}

// ---------- token verification ----------

async function verifyToken() {
  const token = els.token.value.trim();
  if (!token) {
    setMe("Enter a token first", "err");
    return null;
  }
  setMe("Verifying…", "");
  const { ok, json, status } = await discordJson("GET", "/users/@me", {
    token,
    useProxy: els.useProxy.checked,
  });
  if (!ok) {
    setMe(`Invalid token (HTTP ${status})`, "err");
    log(`Token verification failed (HTTP ${status}).`, "err");
    return null;
  }
  state.userId = json.id;
  const tag = json.discriminator && json.discriminator !== "0"
    ? `${json.username}#${json.discriminator}`
    : `@${json.username}`;
  setMe(`Signed in as ${tag} (id ${json.id})`, "ok");
  log(`Verified as ${tag} (${json.id}).`, "ok");
  return json.id;
}

function setMe(text, cls) {
  els.me.textContent = text;
  els.me.classList.remove("ok", "err");
  if (cls) els.me.classList.add(cls);
}

// ---------- search ----------

async function searchMessagesPage({ token, guildId, channelId, authorId, minId, maxId, offset, useProxy }) {
  const query = { author_id: authorId, include_nsfw: "true" };
  if (offset) query.offset = String(offset);
  if (minId) query.min_id = minId;
  if (maxId) query.max_id = maxId;
  if (channelId && guildId) query.channel_id = channelId;

  const endpoint = guildId
    ? `/guilds/${guildId}/messages/search`
    : `/channels/${channelId}/messages/search`;

  while (true) {
    const { ok, status, json, retryAfter } = await discordJson("GET", endpoint, {
      token,
      query,
      useProxy,
    });
    if (ok) return json;
    if (status === 429) {
      const wait = (retryAfter ? parseFloat(retryAfter) : (json && json.retry_after) || 1) * 1000;
      state.rate++;
      renderStats();
      log(`Search rate-limited; waiting ${Math.round(wait)} ms.`, "warn");
      await sleep(wait + 250);
      continue;
    }
    if (status === 202) {
      // Discord is indexing — try again shortly.
      log("Discord is indexing this server. Retrying in 3 s…", "warn");
      await sleep(3000);
      continue;
    }
    const reason = (json && (json.message || JSON.stringify(json))) || `HTTP ${status}`;
    throw new Error(`Search failed: ${reason}`);
  }
}

async function deleteMessage({ token, channelId, messageId, useProxy }) {
  while (true) {
    const { ok, status, json, retryAfter } = await discordJson(
      "DELETE",
      `/channels/${channelId}/messages/${messageId}`,
      { token, useProxy }
    );
    if (ok) return true;
    if (status === 429) {
      const wait = (retryAfter ? parseFloat(retryAfter) : (json && json.retry_after) || 1) * 1000;
      state.rate++;
      renderStats();
      log(`Delete rate-limited; waiting ${Math.round(wait)} ms.`, "warn");
      await sleep(wait + 250);
      continue;
    }
    if (status === 404) {
      // Already gone — treat as success.
      return true;
    }
    if (status === 403) {
      log(`Skipped ${messageId} (no permission).`, "warn");
      return false;
    }
    const reason = (json && (json.message || JSON.stringify(json))) || `HTTP ${status}`;
    log(`Delete failed for ${messageId}: ${reason}`, "err");
    return false;
  }
}

// ---------- main wipe routine ----------

async function startWipe() {
  resetStats();

  const token = els.token.value.trim();
  if (!token) { log("Enter your token first.", "err"); return; }

  let userId = state.userId;
  if (!userId) {
    userId = await verifyToken();
    if (!userId) return;
  }

  const guildId = els.guildId.value.trim() || null;
  const channelId = els.channelId.value.trim() || null;
  if (!guildId && !channelId) {
    log("Enter a Server ID, a Channel ID, or both.", "err");
    return;
  }

  const filters = {
    contains: els.contains.value.trim(),
    attachment: els.hasAttachment.value,
  };
  const minId = snowflakeFromDate(els.afterDate.value);
  const maxId = snowflakeFromDate(els.beforeDate.value);

  const deleteDelay = Math.max(250, parseInt(els.delay.value, 10) || 1100);
  const searchDelay = Math.max(250, parseInt(els.searchDelay.value, 10) || 800);
  const useProxy = els.useProxy.checked;
  const dryRun = els.dryRun.checked;

  if (!dryRun) {
    const target = channelId
      ? `channel ${channelId}${guildId ? ` (server ${guildId})` : ""}`
      : `server ${guildId}`;
    const ok = window.confirm(
      `This will permanently delete ALL of your messages in ${target} that match the current filters.\n\nThis cannot be undone. Continue?`
    );
    if (!ok) { log("Cancelled by user.", "warn"); return; }
  }

  setUIRunning(true);
  state.running = true;
  state.cancelled = false;
  state.paused = false;
  persistTokenIfRequested();

  log(dryRun ? "Starting dry run — no messages will be deleted." : "Starting deletion.", dryRun ? "" : "warn");

  try {
    // Discord's search endpoint returns up to 25 messages per page, paginated by `offset`,
    // and caps `offset` around 5000. We work from the newest backwards: after each batch we
    // tighten `max_id` to the oldest seen id, which lets us walk arbitrarily large histories.
    let pageMaxId = maxId;
    let firstPage = true;

    while (!state.cancelled) {
      await waitWhilePaused();
      if (state.cancelled) break;

      let page;
      try {
        page = await searchMessagesPage({
          token,
          guildId,
          channelId,
          authorId: userId,
          minId,
          maxId: pageMaxId,
          offset: 0,
          useProxy,
        });
      } catch (e) {
        log(e.message || String(e), "err");
        break;
      }

      if (firstPage) {
        const total = page.total_results ?? 0;
        state.totalEstimate = total;
        renderStats();
        log(`Discord reports ${total} matching messages.`, "ok");
        firstPage = false;
      }

      // Each `messages` entry is an array (the hit + adjacent context). The hit has `hit: true`.
      const hits = [];
      for (const group of page.messages || []) {
        const hit = group.find((m) => m.hit) || group[0];
        if (hit && hit.author && hit.author.id === userId) hits.push(hit);
      }

      if (hits.length === 0) {
        log("No more messages found.", "ok");
        break;
      }

      // Walk this page oldest-first so we can advance `pageMaxId` reliably.
      hits.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));

      let oldestThisBatch = null;

      for (const msg of hits) {
        await waitWhilePaused();
        if (state.cancelled) break;

        state.found++;
        // Track the oldest id we *saw* this batch even if we end up skipping
        // it; otherwise an all-filtered batch would stall pagination.
        if (!oldestThisBatch || BigInt(msg.id) < BigInt(oldestThisBatch)) {
          oldestThisBatch = msg.id;
        }

        if (!passesClientFilter(msg, filters)) {
          state.skipped++;
          renderStats();
          continue;
        }

        const preview = (msg.content || "").replace(/\s+/g, " ").slice(0, 80);
        const chanLabel = msg.channel_id ? `#${msg.channel_id}` : "";
        if (dryRun) {
          log(`[dry] would delete ${msg.id} ${chanLabel} — ${preview || "(no text)"}`, "dim");
          state.deleted++;
        } else {
          const ok = await deleteMessage({
            token,
            channelId: msg.channel_id,
            messageId: msg.id,
            useProxy,
          });
          if (ok) {
            state.deleted++;
            log(`Deleted ${msg.id} ${chanLabel} — ${preview || "(no text)"}`, "ok");
          } else {
            state.failed++;
          }
          await sleep(deleteDelay);
        }

        renderStats();
      }

      if (state.cancelled) break;

      // Continue paginating beyond Discord's offset cap by lowering max_id.
      // We step the snowflake down by 1 so the next page is strictly older
      // than what we just processed — this avoids re-fetching the boundary
      // message (Discord's `max_id` is inclusive), which matters in dry runs
      // where the underlying matches don't shrink between searches.
      if (oldestThisBatch) {
        try {
          pageMaxId = (BigInt(oldestThisBatch) - 1n).toString();
        } catch {
          pageMaxId = oldestThisBatch;
        }
      } else {
        break;
      }

      await sleep(searchDelay);
    }
  } finally {
    state.running = false;
    setUIRunning(false);
    log(state.cancelled ? "Stopped." : "Done.", state.cancelled ? "warn" : "ok");
  }
}

function setUIRunning(running) {
  els.start.disabled = running;
  els.pause.disabled = !running;
  els.stop.disabled = !running;
  els.verify.disabled = running;
  if (!running) {
    els.pause.textContent = "Pause";
  }
}

// ---------- wiring ----------

els.toggleToken.addEventListener("click", () => {
  const isPw = els.token.type === "password";
  els.token.type = isPw ? "text" : "password";
  els.toggleToken.textContent = isPw ? "Hide" : "Show";
});

els.remember.addEventListener("change", persistTokenIfRequested);
els.token.addEventListener("blur", persistTokenIfRequested);

els.verify.addEventListener("click", () => {
  verifyToken().catch((e) => log(e.message || String(e), "err"));
});

els.start.addEventListener("click", () => {
  startWipe().catch((e) => {
    log(e.message || String(e), "err");
    state.running = false;
    setUIRunning(false);
  });
});

els.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  els.pause.textContent = state.paused ? "Resume" : "Pause";
  log(state.paused ? "Paused." : "Resumed.", "warn");
});

els.stop.addEventListener("click", () => {
  state.cancelled = true;
  state.paused = false;
  log("Stop requested — finishing current request.", "warn");
});

restoreToken();
renderStats();
