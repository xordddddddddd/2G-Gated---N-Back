"use client";

import type { DiscordGuild } from "@/lib/types";
import { guildIconUrl } from "@/lib/avatars";

interface GuildSelectorProps {
  guilds: DiscordGuild[];
  selected: Set<string>;
  onToggle: (guildId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}

function GuildIcon({ guild }: { guild: DiscordGuild }) {
  const url = guildIconUrl(guild);
  if (url) {
    return <img src={url} alt="" className="h-10 w-10 rounded-full" />;
  }
  const initial = guild.name.charAt(0).toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865f2] text-sm font-semibold text-white">
      {initial}
    </div>
  );
}

export function GuildSelector({
  guilds,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  disabled,
}: GuildSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Select servers</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            disabled={disabled}
            onClick={onSelectAll}
            className="rounded-md px-2 py-1 text-[#00a8fc] hover:bg-white/5 disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onClearAll}
            className="rounded-md px-2 py-1 text-[#b5bac1] hover:bg-white/5 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {guilds.length === 0 ? (
          <p className="text-sm text-[#b5bac1]">No servers found on your account.</p>
        ) : (
          guilds.map((guild) => {
            const isSelected = selected.has(guild.id);
            return (
              <label
                key={guild.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  isSelected
                    ? "border-[#5865f2] bg-[#5865f2]/10"
                    : "border-white/10 bg-[#2b2d31] hover:border-white/20"
                } ${disabled ? "pointer-events-none opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onToggle(guild.id)}
                  className="h-4 w-4 rounded border-white/20 accent-[#5865f2]"
                />
                <GuildIcon guild={guild} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{guild.name}</p>
                  {guild.owner && (
                    <p className="text-xs text-[#faa61a]">Server owner</p>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
