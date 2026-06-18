"use client";

import { useCallback, useEffect, useState } from "react";
import type { DiscordGuild, DiscordUser, WipeEvent } from "@/lib/types";
import { GuildSelector } from "./GuildSelector";
import { UserBar } from "./UserBar";
import { WipeProgress } from "./WipeProgress";

interface DashboardProps {
  initialError?: string;
}

export function Dashboard({ initialError }: DashboardProps) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<WipeEvent[]>([]);
  const [deleteDelayMs, setDeleteDelayMs] = useState(1000);
  const [searchDelayMs, setSearchDelayMs] = useState(5000);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();

      if (!me.authenticated) {
        setUser(null);
        setGuilds([]);
        return;
      }

      setUser(me.user);

      const guildRes = await fetch("/api/discord/guilds");
      if (!guildRes.ok) {
        throw new Error("Failed to load servers");
      }
      const guildData = await guildRes.json();
      setGuilds(guildData.guilds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setGuilds([]);
    setSelected(new Set());
    setEvents([]);
  };

  const handleToggle = (guildId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(guildId)) next.delete(guildId);
      else next.add(guildId);
      return next;
    });
  };

  const handleWipe = async () => {
    if (selected.size === 0) return;

    const confirmed = window.confirm(
      `Permanently delete your messages from ${selected.size} server(s)? This cannot be undone.`,
    );
    if (!confirmed) return;

    setRunning(true);
    setEvents([]);

    try {
      const response = await fetch("/api/discord/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildIds: Array.from(selected),
          deleteDelayMs,
          searchDelayMs,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start wipe");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6)) as WipeEvent;
          setEvents((prev) => [...prev, event]);
        }
      }
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error",
          message: err instanceof Error ? err.message : "Wipe failed",
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#b5bac1]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="max-w-lg space-y-3">
          <h1 className="text-3xl font-bold text-white">Discord Message Wiper</h1>
          <p className="text-[#b5bac1]">
            Sign in with Discord to delete your own messages from specific servers.
            Only messages you authored are removed.
          </p>
        </div>
        <a
          href="/api/auth/login"
          className="inline-flex items-center gap-2 rounded-lg bg-[#5865f2] px-6 py-3 font-medium text-white transition hover:bg-[#4752c4]"
        >
          <DiscordIcon />
          Continue with Discord
        </a>
        {error && <p className="text-sm text-[#f23f43]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Discord Message Wiper</h1>
        <p className="text-sm text-[#b5bac1]">
          Select the servers where you want your messages permanently deleted.
        </p>
      </header>

      <UserBar user={user} onLogout={handleLogout} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6 rounded-2xl border border-white/10 bg-[#313338] p-5">
          <GuildSelector
            guilds={guilds}
            selected={selected}
            onToggle={handleToggle}
            onSelectAll={() => setSelected(new Set(guilds.map((g) => g.id)))}
            onClearAll={() => setSelected(new Set())}
            disabled={running}
          />

          <div className="space-y-4 border-t border-white/10 pt-4">
            <h3 className="font-medium text-white">Rate limit settings</h3>
            <label className="block space-y-1 text-sm text-[#b5bac1]">
              Delay between deletes (ms)
              <input
                type="number"
                min={300}
                max={10000}
                step={100}
                value={deleteDelayMs}
                disabled={running}
                onChange={(e) => setDeleteDelayMs(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-white"
              />
            </label>
            <label className="block space-y-1 text-sm text-[#b5bac1]">
              Delay between search pages (ms)
              <input
                type="number"
                min={1000}
                max={60000}
                step={500}
                value={searchDelayMs}
                disabled={running}
                onChange={(e) => setSearchDelayMs(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-white"
              />
            </label>
            <p className="text-xs text-[#80848e]">
              Higher delays reduce the chance of Discord rate limits. Large histories
              can take a long time.
            </p>
          </div>

          <button
            type="button"
            disabled={running || selected.size === 0}
            onClick={handleWipe}
            className="w-full rounded-lg bg-[#da373c] px-4 py-3 font-semibold text-white transition hover:bg-[#a12828] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running
              ? "Deleting messages…"
              : `Delete my messages from ${selected.size} server(s)`}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#313338] p-5">
          <WipeProgress events={events} running={running} />
        </section>
      </div>

      <footer className="rounded-xl border border-[#faa61a]/30 bg-[#faa61a]/10 p-4 text-sm text-[#dbdee1]">
        <strong className="text-[#faa61a]">Important:</strong> Deleted messages
        cannot be recovered. This tool only removes messages you sent. Discord may
        rate-limit bulk deletions — keep this tab open until the run completes.
        You must create a Discord application and configure OAuth credentials to
        deploy this app.
      </footer>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
