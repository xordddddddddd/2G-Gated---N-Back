export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordChannel {
  id: string;
  type: number;
  name: string;
  parent_id?: string | null;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: { id: string };
  content: string;
  timestamp: string;
}

export interface WipeOptions {
  guildIds: string[];
  deleteDelayMs: number;
  searchDelayMs: number;
}

export type WipeEvent =
  | { type: "status"; message: string }
  | { type: "guild_start"; guildId: string; guildName: string }
  | { type: "guild_complete"; guildId: string; deleted: number }
  | { type: "deleted"; guildId: string; channelId: string; messageId: string; total: number }
  | { type: "rate_limit"; retryAfterMs: number }
  | { type: "error"; guildId?: string; message: string }
  | { type: "complete"; totalDeleted: number; guildsProcessed: number };

export const TEXT_CHANNEL_TYPES = new Set([0, 5, 10, 11, 12]);
