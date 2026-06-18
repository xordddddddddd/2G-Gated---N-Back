"use client";

import type { WipeEvent } from "@/lib/types";

interface WipeProgressProps {
  events: WipeEvent[];
  running: boolean;
}

function formatEvent(event: WipeEvent): string {
  switch (event.type) {
    case "status":
      return event.message;
    case "guild_start":
      return `Scanning ${event.guildName}…`;
    case "deleted":
      return `Deleted message ${event.messageId} (${event.total} total)`;
    case "guild_complete":
      return `Finished server — ${event.deleted} message(s) removed`;
    case "rate_limit":
      return `Rate limited — waiting ${Math.ceil(event.retryAfterMs / 1000)}s`;
    case "error":
      return `Error: ${event.message}`;
    case "complete":
      return `Done — ${event.totalDeleted} message(s) deleted across ${event.guildsProcessed} server(s)`;
    default:
      return "";
  }
}

export function WipeProgress({ events, running }: WipeProgressProps) {
  const latest = events[events.length - 1];
  const deletedCount = events
    .filter((e): e is Extract<WipeEvent, { type: "deleted" }> => e.type === "deleted")
    .length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Progress</h2>
        {running && (
          <span className="flex items-center gap-2 text-sm text-[#b5bac1]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#23a559]" />
            Running
          </span>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1e1f22] p-4">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <p className="text-2xl font-semibold text-white">{deletedCount}</p>
          <p className="text-sm text-[#b5bac1]">messages deleted this run</p>
        </div>
        {latest && (
          <p className="truncate text-sm text-[#dbdee1]">{formatEvent(latest)}</p>
        )}
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#2b2d31] p-3 font-mono text-xs text-[#b5bac1]">
        {events.length === 0 ? (
          <p>Activity will appear here when a wipe starts.</p>
        ) : (
          events.map((event, index) => (
            <p key={index} className="py-0.5">
              {formatEvent(event)}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
