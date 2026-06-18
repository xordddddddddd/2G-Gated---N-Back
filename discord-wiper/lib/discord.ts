// Client-side Discord helpers. All requests go through our same-origin proxy at
// /api/discord/* which forwards them to Discord with the user's token.

const DISCORD_EPOCH = 1420070400000n;

export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
};

export type DiscordGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
};

export type DiscordChannel = {
  id: string;
  type: number;
  name?: string | null;
  recipients?: DiscordUser[];
};

export type DiscordMessage = {
  id: string;
  channel_id: string;
  type: number;
  content: string;
  timestamp: string;
  pinned?: boolean;
  author: DiscordUser;
  attachments?: unknown[];
  embeds?: unknown[];
  hit?: boolean;
};

export type Filters = {
  contentIncludes?: string;
  hasLink?: boolean;
  hasFile?: boolean;
  afterDate?: string; // yyyy-mm-dd
  beforeDate?: string; // yyyy-mm-dd
  channelId?: string; // restrict a guild wipe to one channel
};

export class HttpError extends Error {
  status: number;
  retryAfter?: number;
  global?: boolean;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function dateToSnowflake(date: string, endOfDay = false): string | null {
  if (!date) return null;
  const ms = Date.parse(endOfDay ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`);
  if (Number.isNaN(ms)) return null;
  return ((BigInt(ms) - DISCORD_EPOCH) << 22n).toString();
}

type ApiInit = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

// Low-level request. Throws HttpError on non-2xx (except 429/202 which callers
// may want to handle specially via the returned status).
export async function rawApi(
  token: string,
  path: string,
  init: ApiInit = {}
): Promise<Response> {
  const res = await fetch(`/api/discord/${path}`, {
    method: init.method ?? "GET",
    headers: {
      "x-discord-token": token,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
  return res;
}

export async function getMe(token: string): Promise<DiscordUser> {
  const res = await rawApi(token, "users/@me");
  if (res.status === 401) throw new HttpError(401, "Invalid token.");
  if (!res.ok) throw new HttpError(res.status, `Failed to load account (${res.status}).`);
  return res.json();
}

export async function getGuilds(token: string): Promise<DiscordGuild[]> {
  const res = await rawApi(token, "users/@me/guilds");
  if (!res.ok) throw new HttpError(res.status, `Failed to load servers (${res.status}).`);
  return res.json();
}

export async function getDmChannels(token: string): Promise<DiscordChannel[]> {
  const res = await rawApi(token, "users/@me/channels");
  if (!res.ok) throw new HttpError(res.status, `Failed to load DMs (${res.status}).`);
  return res.json();
}

// ---- Wipe engine ----------------------------------------------------------

export type WipeTarget =
  | { kind: "guild"; id: string; name: string }
  | { kind: "channel"; id: string; name: string };

export type WipeStats = {
  scanned: number;
  deleted: number;
  failed: number;
  skipped: number;
  total: number | null;
};

export type LogLevel = "info" | "success" | "error" | "warn";

export type WipeCallbacks = {
  onLog: (level: LogLevel, message: string) => void;
  onStats: (stats: WipeStats) => void;
  signal: AbortSignal;
  isPaused: () => boolean;
  deleteDelayMs: number;
  searchDelayMs: number;
};

function messageMatches(msg: DiscordMessage, meId: string, filters: Filters): boolean {
  if (msg.author?.id !== meId) return false;
  // Only default messages (0) and replies (19) are user-deletable.
  if (msg.type !== 0 && msg.type !== 19) return false;
  if (filters.contentIncludes) {
    if (!msg.content?.toLowerCase().includes(filters.contentIncludes.toLowerCase()))
      return false;
  }
  if (filters.hasFile && !(msg.attachments && msg.attachments.length > 0)) return false;
  if (filters.hasLink) {
    const hasUrl = /https?:\/\//i.test(msg.content || "") || (msg.embeds?.length ?? 0) > 0;
    if (!hasUrl) return false;
  }
  return true;
}

async function deleteMessage(
  token: string,
  msg: DiscordMessage,
  cb: WipeCallbacks
): Promise<"deleted" | "failed"> {
  // Retry loop purely for 429 rate limits.
  for (let attempt = 0; attempt < 10; attempt++) {
    if (cb.signal.aborted) throw new DOMException("Aborted", "AbortError");
    const res = await rawApi(token, `channels/${msg.channel_id}/messages/${msg.id}`, {
      method: "DELETE",
      signal: cb.signal,
    });
    if (res.status === 204 || res.status === 200) return "deleted";
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      const retryAfter = Number((data as { retry_after?: number }).retry_after ?? 1);
      const isGlobal = Boolean((data as { global?: boolean }).global);
      cb.onLog(
        "warn",
        `Rate limited${isGlobal ? " (global)" : ""}. Waiting ${retryAfter.toFixed(1)}s...`
      );
      await sleep(retryAfter * 1000 + 250);
      continue;
    }
    if (res.status === 404) return "deleted"; // already gone
    const body = await res.text().catch(() => "");
    cb.onLog("error", `Delete failed (${res.status}) for ${msg.id}. ${body.slice(0, 120)}`);
    return "failed";
  }
  return "failed";
}

async function searchGuild(
  token: string,
  guildId: string,
  meId: string,
  filters: Filters,
  offset: number,
  cb: WipeCallbacks
): Promise<{ status: number; total: number; messages: DiscordMessage[]; retryAfter?: number }> {
  const params = new URLSearchParams();
  params.set("author_id", meId);
  params.set("include_nsfw", "true");
  params.set("offset", String(offset));
  if (filters.channelId) params.set("channel_id", filters.channelId);
  if (filters.contentIncludes) params.set("content", filters.contentIncludes);
  if (filters.hasLink) params.append("has", "link");
  if (filters.hasFile) params.append("has", "file");
  const min = filters.afterDate ? dateToSnowflake(filters.afterDate) : null;
  const max = filters.beforeDate ? dateToSnowflake(filters.beforeDate, true) : null;
  if (min) params.set("min_id", min);
  if (max) params.set("max_id", max);

  const res = await rawApi(token, `guilds/${guildId}/messages/search?${params.toString()}`, {
    signal: cb.signal,
  });

  if (res.status === 202) {
    const data = await res.json().catch(() => ({}) as Record<string, unknown>);
    const retryAfter = Number((data as { retry_after?: number }).retry_after ?? 2);
    return { status: 202, total: 0, messages: [], retryAfter };
  }
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}) as Record<string, unknown>);
    const retryAfter = Number((data as { retry_after?: number }).retry_after ?? 2);
    return { status: 429, total: 0, messages: [], retryAfter };
  }
  if (!res.ok) {
    throw new HttpError(res.status, `Search failed (${res.status}).`);
  }
  const data = (await res.json()) as {
    total_results: number;
    messages: DiscordMessage[][];
  };
  const hits: DiscordMessage[] = (data.messages || [])
    .map((group) => group.find((m) => m.hit) ?? group[0])
    .filter(Boolean);
  return { status: 200, total: data.total_results ?? 0, messages: hits };
}

async function wipeGuild(
  token: string,
  target: WipeTarget,
  meId: string,
  filters: Filters,
  cb: WipeCallbacks,
  stats: WipeStats
) {
  let offset = 0;
  cb.onLog("info", `Searching "${target.name}" for your messages...`);

  while (!cb.signal.aborted) {
    while (cb.isPaused() && !cb.signal.aborted) await sleep(400);

    const result = await searchGuild(token, target.id, meId, filters, offset, cb);

    if (result.status === 202) {
      cb.onLog("info", `Server is still indexing messages. Waiting ${result.retryAfter}s...`);
      await sleep((result.retryAfter ?? 2) * 1000);
      continue;
    }
    if (result.status === 429) {
      cb.onLog("warn", `Search rate limited. Waiting ${result.retryAfter}s...`);
      await sleep((result.retryAfter ?? 2) * 1000);
      continue;
    }

    stats.total = result.total;
    cb.onStats({ ...stats });

    if (result.messages.length === 0) {
      if (offset >= result.total) break;
      // Page consisted entirely of non-deletable / filtered messages.
      offset += 25;
      continue;
    }

    for (const msg of result.messages) {
      if (cb.signal.aborted) return;
      while (cb.isPaused() && !cb.signal.aborted) await sleep(400);
      stats.scanned++;

      if (!messageMatches(msg, meId, filters)) {
        stats.skipped++;
        offset++; // stays in results, so move past it
        cb.onStats({ ...stats });
        continue;
      }

      const outcome = await deleteMessage(token, msg, cb);
      if (outcome === "deleted") {
        stats.deleted++;
        cb.onLog("success", `Deleted message ${msg.id}${msg.content ? `: "${trunc(msg.content)}"` : ""}`);
      } else {
        stats.failed++;
        offset++; // failed to delete; skip past it next round
      }
      cb.onStats({ ...stats });
      await sleep(cb.deleteDelayMs);
    }

    await sleep(cb.searchDelayMs);
  }
}

async function wipeChannel(
  token: string,
  target: WipeTarget,
  meId: string,
  filters: Filters,
  cb: WipeCallbacks,
  stats: WipeStats
) {
  let before: string | null = null;
  const minId = filters.afterDate ? dateToSnowflake(filters.afterDate) : null;
  const maxId = filters.beforeDate ? dateToSnowflake(filters.beforeDate, true) : null;
  cb.onLog("info", `Scanning "${target.name}" for your messages...`);

  while (!cb.signal.aborted) {
    while (cb.isPaused() && !cb.signal.aborted) await sleep(400);

    const params = new URLSearchParams();
    params.set("limit", "100");
    if (before) params.set("before", before);
    const res = await rawApi(token, `channels/${target.id}/messages?${params.toString()}`, {
      signal: cb.signal,
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      const retryAfter = Number((data as { retry_after?: number }).retry_after ?? 2);
      cb.onLog("warn", `Rate limited. Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    if (!res.ok) throw new HttpError(res.status, `Failed to read channel (${res.status}).`);

    const page = (await res.json()) as DiscordMessage[];
    if (page.length === 0) break;
    before = page[page.length - 1].id;

    for (const msg of page) {
      if (cb.signal.aborted) return;
      while (cb.isPaused() && !cb.signal.aborted) await sleep(400);
      if (minId && BigInt(msg.id) < BigInt(minId)) continue;
      if (maxId && BigInt(msg.id) > BigInt(maxId)) continue;
      stats.scanned++;
      cb.onStats({ ...stats });
      if (!messageMatches(msg, meId, filters)) {
        stats.skipped++;
        continue;
      }
      const outcome = await deleteMessage(token, msg, cb);
      if (outcome === "deleted") {
        stats.deleted++;
        cb.onLog("success", `Deleted message ${msg.id}${msg.content ? `: "${trunc(msg.content)}"` : ""}`);
      } else {
        stats.failed++;
      }
      cb.onStats({ ...stats });
      await sleep(cb.deleteDelayMs);
    }
    await sleep(cb.searchDelayMs);
  }
}

function trunc(s: string, n = 60): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? `${oneLine.slice(0, n)}…` : oneLine;
}

export async function runWipe(
  token: string,
  meId: string,
  target: WipeTarget,
  filters: Filters,
  cb: WipeCallbacks
): Promise<WipeStats> {
  const stats: WipeStats = { scanned: 0, deleted: 0, failed: 0, skipped: 0, total: null };
  try {
    if (target.kind === "guild") {
      await wipeGuild(token, target, meId, filters, cb, stats);
    } else {
      await wipeChannel(token, target, meId, filters, cb, stats);
    }
    if (cb.signal.aborted) {
      cb.onLog("warn", "Stopped by user.");
    } else {
      cb.onLog("success", `Done. Deleted ${stats.deleted} message(s).`);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      cb.onLog("warn", "Stopped by user.");
    } else if (err instanceof HttpError) {
      cb.onLog("error", err.message);
    } else {
      cb.onLog("error", `Unexpected error: ${(err as Error).message}`);
    }
  }
  return stats;
}
