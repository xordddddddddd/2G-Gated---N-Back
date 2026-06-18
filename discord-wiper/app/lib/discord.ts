"use client";

export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
};

export type DiscordGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions?: string;
};

export type DiscordChannel = {
  id: string;
  name?: string | null;
  type: number;
  parent_id?: string | null;
};

export type DiscordMessage = {
  id: string;
  channel_id: string;
  guild_id?: string;
  content: string;
  timestamp: string;
  author: { id: string; username: string };
  attachments?: Array<{ id: string; filename: string }>;
  type: number;
  flags?: number;
  pinned?: boolean;
};

export type SearchResponse = {
  total_results: number;
  messages: DiscordMessage[][];
  analytics_id?: string;
};

export class DiscordError extends Error {
  status: number;
  retryAfterMs?: number;
  isGlobal?: boolean;
  body: unknown;

  constructor(
    message: string,
    status: number,
    body: unknown,
    retryAfterMs?: number,
    isGlobal?: boolean,
  ) {
    super(message);
    this.status = status;
    this.body = body;
    this.retryAfterMs = retryAfterMs;
    this.isGlobal = isGlobal;
  }
}

export type RateLimitMeta = {
  bucket?: string;
  limit?: number;
  remaining?: number;
  resetAfterMs?: number;
};

async function call<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta: RateLimitMeta; status: number }> {
  const res = await fetch(`/api/discord?path=${encodeURIComponent(path)}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "x-discord-auth": token,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  const meta: RateLimitMeta = {
    bucket: res.headers.get("x-ratelimit-bucket") ?? undefined,
    limit: numHeader(res.headers.get("x-ratelimit-limit")),
    remaining: numHeader(res.headers.get("x-ratelimit-remaining")),
    resetAfterMs: floatSecToMs(res.headers.get("x-ratelimit-reset-after")),
  };

  if (!res.ok) {
    const isGlobal = res.headers.get("x-ratelimit-global") === "true";
    let retryAfterMs: number | undefined;
    const retryHeader = res.headers.get("retry-after");
    if (retryHeader) retryAfterMs = parseFloat(retryHeader) * 1000;
    if (
      retryAfterMs == null &&
      body &&
      typeof body === "object" &&
      "retry_after" in body
    ) {
      const ra = (body as { retry_after?: number }).retry_after;
      if (typeof ra === "number") retryAfterMs = ra * 1000;
    }
    throw new DiscordError(
      `Discord API ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
      res.status,
      body,
      retryAfterMs,
      isGlobal,
    );
  }

  return { data: body as T, meta, status: res.status };
}

function numHeader(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function floatSecToMs(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.ceil(n * 1000) : undefined;
}

export async function getMe(token: string): Promise<DiscordUser> {
  const { data } = await call<DiscordUser>(token, "/users/@me");
  return data;
}

export async function getGuilds(token: string): Promise<DiscordGuild[]> {
  const { data } = await call<DiscordGuild[]>(token, "/users/@me/guilds");
  return data;
}

export async function getGuildChannels(
  token: string,
  guildId: string,
): Promise<DiscordChannel[]> {
  const { data } = await call<DiscordChannel[]>(
    token,
    `/guilds/${guildId}/channels`,
  );
  return data;
}

export type SearchOptions = {
  guildId: string;
  authorId: string;
  channelId?: string;
  offset?: number;
  beforeId?: string;
  afterId?: string;
  includeNsfw?: boolean;
};

export async function searchMessages(
  token: string,
  opts: SearchOptions,
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set("author_id", opts.authorId);
  if (opts.channelId) params.set("channel_id", opts.channelId);
  if (opts.offset) params.set("offset", String(opts.offset));
  if (opts.beforeId) params.set("max_id", opts.beforeId);
  if (opts.afterId) params.set("min_id", opts.afterId);
  if (opts.includeNsfw) params.set("include_nsfw", "true");
  const { data } = await call<SearchResponse>(
    token,
    `/guilds/${opts.guildId}/messages/search?${params.toString()}`,
  );
  return data;
}

export async function deleteMessage(
  token: string,
  channelId: string,
  messageId: string,
): Promise<RateLimitMeta> {
  const { meta } = await call<unknown>(
    token,
    `/channels/${channelId}/messages/${messageId}`,
    { method: "DELETE" },
  );
  return meta;
}

export function avatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
}

export function guildIconUrl(guild: DiscordGuild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
