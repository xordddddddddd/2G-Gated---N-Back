"use strict";

/* ----------------------------------------------------------------------------
 * Discord Message Wiper — front-end logic
 *
 * Talks to the local proxy at /api/discord, which forwards requests to the
 * real Discord API. Everything (token, message data) stays in this tab.
 * -------------------------------------------------------------------------- */

const DISCORD_EPOCH = 1420070400000n;

const state = {
  token: "",
  me: null, // { id, username, ... }
  guilds: [], // [{ id, name }]
  running: false,
  stopRequested: false,
  stats: { found: 0, deleted: 0, failed: 0 },
};

/* ---- tiny DOM helpers ---- */
const $ = (id) => document.getElementById(id);
const show = (el) => el.removeAttribute("hidden");
const hide = (el) => el.setAttribute("hidden", "");

function log(msg, kind = "") {
  const el = $("log");
  const line = document.createElement("span");
  if (kind) line.className = `l-${kind}`;
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${msg}\n`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dateToSnowflake(dateStr, endOfDay = false) {
  if (!dateStr) return null;
  const ms = new Date(dateStr + (endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z")).getTime();
  if (Number.isNaN(ms)) return null;
  return ((BigInt(ms) - DISCORD_EPOCH) << 22n).toString();
}

/* ----------------------------------------------------------------------------
 * Proxy request with automatic rate-limit (429) handling.
 * -------------------------------------------------------------------------- */
async function discord(method, path, body) {
  for (let attempt = 0; attempt < 8; attempt++) {
    let resp;
    try {
      resp = await fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, path, token: state.token, body }),
      });
    } catch (err) {
      throw new Error("Could not reach the local proxy. Is the server running?");
    }

    const payload = await resp.json();

    if (payload.error) throw new Error(payload.error);

    const { status, retryAfter, data } = payload;

    // Rate limited — wait and retry.
    if (status === 429) {
      const waitMs = Math.max((retryAfter || 1) * 1000, 1000) + 250;
      log(`Rate limited. Waiting ${(waitMs / 1000).toFixed(1)}s…`, "warn");
      await sleep(waitMs);
      continue;
    }

    return { status, data, retryAfter };
  }
  throw new Error("Gave up after repeated rate limits.");
}

/* ----------------------------------------------------------------------------
 * Step 1 — connect
 * -------------------------------------------------------------------------- */
async function connect() {
  const token = $("token").value.trim();
  if (!token) {
    setAuthStatus("Please paste your token first.", "err");
    return;
  }
  state.token = token;
  setAuthStatus("Connecting…");
  $("connect").disabled = true;

  try {
    const me = await discord("GET", "/users/@me");
    if (me.status === 401) {
      throw new Error("Token rejected by Discord (401). Double-check it.");
    }
    if (me.status !== 200 || !me.data || !me.data.id) {
      throw new Error(`Unexpected response (${me.status}).`);
    }
    state.me = me.data;

    const guilds = await discord("GET", "/users/@me/guilds");
    if (guilds.status !== 200 || !Array.isArray(guilds.data)) {
      throw new Error(`Could not load your servers (${guilds.status}).`);
    }
    state.guilds = guilds.data
      .map((g) => ({ id: g.id, name: g.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    renderAccount();
    populateGuilds();
    setAuthStatus(`Connected as ${me.data.username}.`, "ok");
    show($("step-config"));
    show($("step-progress"));
  } catch (err) {
    setAuthStatus(err.message, "err");
    state.token = "";
  } finally {
    $("connect").disabled = false;
  }
}

function setAuthStatus(msg, kind = "") {
  const el = $("auth-status");
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : "");
}

function renderAccount() {
  const { me } = state;
  const avatar = me.avatar
    ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  $("account-bar").innerHTML = `
    <img src="${avatar}" alt="" />
    <span>Signed in as <strong>${escapeHtml(me.username)}</strong> · ${state.guilds.length} servers</span>`;
}

function populateGuilds() {
  const sel = $("guild");
  sel.innerHTML = "";
  for (const g of state.guilds) {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    sel.appendChild(opt);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ----------------------------------------------------------------------------
 * Search — returns one page of your messages in a guild.
 * -------------------------------------------------------------------------- */
function buildSearchPath(guildId, offset) {
  const params = new URLSearchParams();
  params.set("author_id", state.me.id);
  params.set("include_nsfw", "true");
  if (offset) params.set("offset", String(offset));

  const channelId = $("channelId").value.trim();
  if (channelId) params.set("channel_id", channelId);

  const contains = $("containsText").value.trim();
  if (contains) params.set("content", contains);

  const minId = dateToSnowflake($("afterDate").value, false);
  if (minId) params.set("min_id", minId);
  const maxId = dateToSnowflake($("beforeDate").value, true);
  if (maxId) params.set("max_id", maxId);

  return `/guilds/${guildId}/messages/search?${params.toString()}`;
}

async function searchPage(guildId, offset) {
  // The search index can return 202 ("not indexed yet, retry").
  for (let i = 0; i < 10; i++) {
    const res = await discord("GET", buildSearchPath(guildId, offset));
    if (res.status === 202) {
      const wait = (res.data?.retry_after || 1) * 1000 + 500;
      log(`Server is indexing messages. Waiting ${(wait / 1000).toFixed(1)}s…`, "info");
      await sleep(wait);
      continue;
    }
    if (res.status === 403) {
      throw new Error("No permission to search this server (403).");
    }
    if (res.status !== 200) {
      throw new Error(`Search failed (${res.status}).`);
    }
    return res.data; // { total_results, messages: [[...]] }
  }
  throw new Error("Search kept returning 'indexing'. Try again later.");
}

// A message is deletable by its author if it is a normal message or a reply.
function isDeletable(m) {
  return m.author && m.author.id === state.me.id && (m.type === 0 || m.type === 19);
}

/* ----------------------------------------------------------------------------
 * Main loop — shared by dry run and real delete.
 * -------------------------------------------------------------------------- */
async function run(dryRun) {
  if (state.running) return;
  state.running = true;
  state.stopRequested = false;
  state.stats = { found: 0, deleted: 0, failed: 0 };
  updateStats();
  $("log").textContent = "";

  const guildId = $("guild").value;
  const guildName = state.guilds.find((g) => g.id === guildId)?.name || guildId;
  const delay = Math.max(parseInt($("delay").value, 10) || 1150, 300);

  setRunningUI(true, dryRun);
  log(`${dryRun ? "DRY RUN" : "DELETING"} — server: ${guildName}`, "info");

  let offset = 0;
  let totalReported = 0;

  try {
    while (!state.stopRequested) {
      const page = await searchPage(guildId, offset);
      totalReported = page.total_results || 0;

      const groups = page.messages || [];
      if (groups.length === 0) break;

      // Each group is an array of context messages; the hit has hit:true.
      const hits = [];
      for (const group of groups) {
        const m = group.find((x) => x.hit) || group[0];
        if (m) hits.push(m);
      }

      const deletable = hits.filter(isDeletable);

      if (deletable.length === 0) {
        // This page only has undeletable items (system msgs, etc.). Skip ahead.
        offset += 25;
        if (offset >= totalReported || offset > 5000) break;
        continue;
      }

      for (const m of deletable) {
        if (state.stopRequested) break;
        state.stats.found++;

        const preview = (m.content || "").replace(/\s+/g, " ").slice(0, 60);

        if (dryRun) {
          log(`would delete · #${m.channel_id} · ${preview || "(no text)"}`);
          updateStats();
          continue;
        }

        const res = await discord("DELETE", `/channels/${m.channel_id}/messages/${m.id}`);
        if (res.status === 204 || res.status === 200) {
          state.stats.deleted++;
          log(`deleted · ${preview || "(no text)"}`, "ok");
        } else if (res.status === 404) {
          state.stats.failed++;
          log(`already gone (404) · skipping`, "warn");
        } else if (res.status === 403) {
          state.stats.failed++;
          log(`no permission (403) · skipping`, "err");
        } else {
          state.stats.failed++;
          log(`failed (${res.status}) · skipping`, "err");
        }
        updateStats();
        updateProgress(totalReported);
        await sleep(delay + Math.random() * 200);
      }

      if (dryRun) {
        // In dry run we don't delete, so walk the whole list by paging.
        offset += 25;
        if (offset >= totalReported || offset > 5000) break;
      }
      // In real mode we keep offset where it is: deleted items shift the list,
      // so the next search naturally surfaces the next batch.
    }

    if (state.stopRequested) {
      log("Stopped by user.", "warn");
    } else if (dryRun) {
      log(`Dry run complete. ${state.stats.found} message(s) would be deleted.`, "info");
      $("start").disabled = false;
    } else {
      log(`Done. Deleted ${state.stats.deleted}, skipped/failed ${state.stats.failed}.`, "ok");
    }
  } catch (err) {
    log("Error: " + err.message, "err");
  } finally {
    state.running = false;
    setRunningUI(false, dryRun);
  }
}

function updateStats() {
  $("stat-found").textContent = state.stats.found;
  $("stat-deleted").textContent = state.stats.deleted;
  $("stat-failed").textContent = state.stats.failed;
}

function updateProgress(total) {
  const done = state.stats.deleted + state.stats.failed;
  const denom = Math.max(total, done, 1);
  $("progress-bar").style.width = Math.min((done / denom) * 100, 100) + "%";
}

function setRunningUI(running, dryRun) {
  $("dry-run").disabled = running;
  $("start").disabled = running || (!dryRun && state.stats.found === 0 && false);
  $("guild").disabled = running;
  if (running) {
    show($("stop"));
    if (!dryRun) $("start").disabled = true;
  } else {
    hide($("stop"));
  }
}

/* ----------------------------------------------------------------------------
 * Wiring
 * -------------------------------------------------------------------------- */
$("ack").addEventListener("change", (e) => {
  if (e.target.checked) show($("step-auth"));
  else hide($("step-auth"));
});

$("howto-toggle").addEventListener("click", () => {
  const el = $("howto");
  el.hidden ? show(el) : hide(el);
});

$("connect").addEventListener("click", connect);
$("token").addEventListener("keydown", (e) => {
  if (e.key === "Enter") connect();
});

$("dry-run").addEventListener("click", () => run(true));

$("start").addEventListener("click", () => {
  const guildName = state.guilds.find((g) => g.id === $("guild").value)?.name || "this server";
  const ok = window.confirm(
    `Permanently delete your messages in "${guildName}"?\n\nThis cannot be undone.`
  );
  if (ok) run(false);
});

$("stop").addEventListener("click", () => {
  state.stopRequested = true;
  log("Stopping after the current message…", "warn");
});
