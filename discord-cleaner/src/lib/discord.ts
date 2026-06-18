import type {
  DiscordChannel,
  DiscordGuild,
  DiscordMessage,
  DiscordUser,
  WipeEvent,
} from "./types";
import { TEXT_CHANNEL_TYPES } from "./types";

const DISCORD_API = "https://discord.com/api/v10";

export class DiscordApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfterMs?: number,
  ) {
    super(message);
    this.name = "DiscordApiError";
  }
}

async function discordFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 429) {
    const body = (await response.json().catch(() => ({}))) as {
      retry_after?: number;
      message?: string;
    };
    const retryAfterMs = Math.ceil((body.retry_after ?? 1) * 1000);
    throw new DiscordApiError(
      body.message ?? "Rate limited",
      429,
      retryAfterMs,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new DiscordApiError(
      body.message ?? `Discord API error (${response.status})`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getOAuthUrl(state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const redirectUri = getRedirectUri();
  const scopes = ["identify", "guilds", "guilds.channels.read"].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    prompt: "consent",
  });

  return `https://discord.com/oauth2/authorize?${params}`;
}

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/callback`;
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    client_secret: process.env.DISCORD_CLIENT_SECRET!,
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      error_description?: string;
    };
    throw new Error(error.error_description ?? "Failed to exchange OAuth code");
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    client_secret: process.env.DISCORD_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function getCurrentUser(accessToken: string): Promise<DiscordUser> {
  return discordFetch<DiscordUser>("/users/@me", accessToken);
}

export async function getGuilds(accessToken: string): Promise<DiscordGuild[]> {
  return discordFetch<DiscordGuild[]>("/users/@me/guilds", accessToken);
}

export async function getGuildChannels(
  accessToken: string,
  guildId: string,
): Promise<DiscordChannel[]> {
  return discordFetch<DiscordChannel[]>(
    `/guilds/${guildId}/channels`,
    accessToken,
  );
}

export async function searchGuildMessages(
  accessToken: string,
  guildId: string,
  authorId: string,
  offset = 0,
): Promise<{ messages: DiscordMessage[][]; total_results: number }> {
  const params = new URLSearchParams({
    author_id: authorId,
    offset: String(offset),
  });

  return discordFetch(
    `/guilds/${guildId}/messages/search?${params}`,
    accessToken,
  );
}

export async function getChannelMessages(
  accessToken: string,
  channelId: string,
  before?: string,
): Promise<DiscordMessage[]> {
  const params = before ? `?before=${before}&limit=100` : "?limit=100";
  return discordFetch<DiscordMessage[]>(
    `/channels/${channelId}/messages${params}`,
    accessToken,
  );
}

export async function deleteMessage(
  accessToken: string,
  channelId: string,
  messageId: string,
): Promise<void> {
  await discordFetch<void>(
    `/channels/${channelId}/messages/${messageId}`,
    accessToken,
    { method: "DELETE" },
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  onRateLimit: (retryAfterMs: number) => void,
): Promise<T> {
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DiscordApiError && error.status === 429) {
        const retryAfterMs = error.retryAfterMs ?? 1000;
        onRateLimit(retryAfterMs);
        await sleep(retryAfterMs);
        continue;
      }
      throw error;
    }
  }
}

export async function wipeGuildMessages(
  accessToken: string,
  userId: string,
  guild: DiscordGuild,
  options: { deleteDelayMs: number; searchDelayMs: number },
  emit: (event: WipeEvent) => void,
): Promise<number> {
  let deleted = 0;
  let searchWorked = true;

  emit({
    type: "guild_start",
    guildId: guild.id,
    guildName: guild.name,
  });

  const onRateLimit = (retryAfterMs: number) => {
    emit({ type: "rate_limit", retryAfterMs });
  };

  // Try guild-wide search first (much faster when available).
  let offset = 0;
  try {
    while (true) {
      const result = await withRateLimitRetry(
        () => searchGuildMessages(accessToken, guild.id, userId, offset),
        onRateLimit,
      );

      const flat = result.messages.flat();
      if (flat.length === 0) break;

      for (const message of flat) {
        await withRateLimitRetry(
          () => deleteMessage(accessToken, message.channel_id, message.id),
          onRateLimit,
        );
        deleted++;
        emit({
          type: "deleted",
          guildId: guild.id,
          channelId: message.channel_id,
          messageId: message.id,
          total: deleted,
        });
        if (options.deleteDelayMs > 0) {
          await sleep(options.deleteDelayMs);
        }
      }

      offset += flat.length;
      if (options.searchDelayMs > 0) {
        await sleep(options.searchDelayMs);
      }
    }
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 403) {
      searchWorked = false;
      emit({
        type: "status",
        message: `Search unavailable in ${guild.name}, scanning channels individually…`,
      });
    } else {
      throw error;
    }
  }

  if (searchWorked) {
    emit({ type: "guild_complete", guildId: guild.id, deleted });
    return deleted;
  }

  // Fallback: scan each text channel the user can access.
  const channels = await withRateLimitRetry(
    () => getGuildChannels(accessToken, guild.id),
    onRateLimit,
  );

  const textChannels = channels.filter((c) => TEXT_CHANNEL_TYPES.has(c.type));

  for (const channel of textChannels) {
    let before: string | undefined;
    let keepScanning = true;

    while (keepScanning) {
      const messages = await withRateLimitRetry(
        () => getChannelMessages(accessToken, channel.id, before),
        onRateLimit,
      );

      if (messages.length === 0) break;

      for (const message of messages) {
        if (message.author.id !== userId) continue;

        await withRateLimitRetry(
          () => deleteMessage(accessToken, channel.id, message.id),
          onRateLimit,
        );
        deleted++;
        emit({
          type: "deleted",
          guildId: guild.id,
          channelId: channel.id,
          messageId: message.id,
          total: deleted,
        });
        if (options.deleteDelayMs > 0) {
          await sleep(options.deleteDelayMs);
        }
      }

      before = messages[messages.length - 1]?.id;
      keepScanning = messages.length === 100;
      await sleep(500);
    }
  }

  emit({ type: "guild_complete", guildId: guild.id, deleted });
  return deleted;
}

