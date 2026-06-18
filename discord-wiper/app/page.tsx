"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DiscordChannel,
  DiscordError,
  DiscordGuild,
  DiscordMessage,
  DiscordUser,
  avatarUrl,
  delay,
  deleteMessage,
  getGuildChannels,
  getGuilds,
  getMe,
  guildIconUrl,
  searchMessages,
} from "./lib/discord";

type Phase = "auth" | "ready";
type WipeState = "idle" | "scanning" | "deleting" | "paused" | "done";

type LogEntry = {
  id: string;
  level: "info" | "ok" | "warn" | "error";
  msg: string;
  time: string;
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("auth");
  const [token, setToken] = useState("");
  const [me, setMe] = useState<DiscordUser | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [guildId, setGuildId] = useState<string>("");
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [channelId, setChannelId] = useState<string>("");
  const [dryRun, setDryRun] = useState(true);
  const [delayMs, setDelayMs] = useState(1100);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [wipeState, setWipeState] = useState<WipeState>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    found: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stopRef = useRef(false);
  const pauseRef = useRef(false);
  const tokenRef = useRef("");
  tokenRef.current = token;

  function pushLog(level: LogEntry["level"], msg: string) {
    setLogs((cur) => {
      const next = [
        ...cur,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          level,
          msg,
          time: new Date().toLocaleTimeString(),
        },
      ];
      return next.slice(-500);
    });
  }

  async function login() {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const cleaned = token.trim().replace(/^"|"$/g, "");
      if (!cleaned) throw new Error("Paste a token first.");
      const u = await getMe(cleaned);
      const g = await getGuilds(cleaned);
      setMe(u);
      setGuilds(
        [...g].sort((a, b) => a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        })),
      );
      setToken(cleaned);
      setPhase("ready");
      pushLog("ok", `Signed in as ${u.global_name || u.username} (${u.id})`);
    } catch (err) {
      const e = err as DiscordError | Error;
      const msg =
        e instanceof DiscordError && e.status === 401
          ? "Token rejected by Discord (401). Make sure you copied a USER token, not a bot token."
          : e.message || String(e);
      setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    stopRef.current = true;
    setPhase("auth");
    setToken("");
    setMe(null);
    setGuilds([]);
    setChannels([]);
    setGuildId("");
    setChannelId("");
    setLogs([]);
    setStats({ found: 0, deleted: 0, skipped: 0, failed: 0 });
    setWipeState("idle");
  }

  useEffect(() => {
    if (!guildId) {
      setChannels([]);
      setChannelId("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ch = await getGuildChannels(tokenRef.current, guildId);
        if (cancelled) return;
        const textLike = ch.filter((c) =>
          [0, 5, 10, 11, 12, 15].includes(c.type),
        );
        setChannels(textLike);
      } catch (err) {
        pushLog(
          "warn",
          `Couldn't load channels: ${(err as Error).message}. (Not required — search works without it.)`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const selectedGuild = useMemo(
    () => guilds.find((g) => g.id === guildId) || null,
    [guilds, guildId],
  );
  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === channelId) || null,
    [channels, channelId],
  );

  async function runWipe() {
    setConfirmOpen(false);
    if (!me || !guildId) return;
    stopRef.current = false;
    pauseRef.current = false;
    setWipeState("scanning");
    setStats({ found: 0, deleted: 0, skipped: 0, failed: 0 });
    pushLog(
      "info",
      `Starting ${dryRun ? "DRY RUN" : "WIPE"} in ${selectedGuild?.name}${
        selectedChannel ? ` / #${selectedChannel.name}` : ""
      }`,
    );

    const tok = tokenRef.current;
    const seen = new Set<string>();
    let beforeId: string | undefined = undefined;
    let consecutiveEmpty = 0;

    try {
      while (!stopRef.current) {
        while (pauseRef.current && !stopRef.current) {
          setWipeState("paused");
          await delay(250);
        }
        if (stopRef.current) break;
        if (wipeState !== "deleting") setWipeState("scanning");

        let batch: DiscordMessage[][] = [];
        try {
          const res = await searchMessages(tok, {
            guildId,
            authorId: me.id,
            channelId: channelId || undefined,
            beforeId,
            includeNsfw: true,
          });
          batch = res.messages || [];
        } catch (err) {
          const e = err as DiscordError;
          if (e.status === 429 && e.retryAfterMs) {
            pushLog(
              "warn",
              `Search rate-limited. Waiting ${Math.ceil(e.retryAfterMs)}ms...`,
            );
            await delay(e.retryAfterMs + 100);
            continue;
          }
          if (e.status === 202) {
            pushLog("info", "Search index warming up, retrying in 2s...");
            await delay(2000);
            continue;
          }
          pushLog("error", `Search failed: ${e.message}`);
          break;
        }

        const flat: DiscordMessage[] = batch
          .map((group) =>
            group.find((m) => (m as DiscordMessage & { hit?: boolean }).hit) ||
            group[0],
          )
          .filter((m): m is DiscordMessage => Boolean(m));

        const fresh = flat.filter((m) => !seen.has(m.id));
        for (const m of fresh) seen.add(m.id);

        if (fresh.length === 0) {
          consecutiveEmpty += 1;
          if (consecutiveEmpty >= 2) {
            pushLog("ok", "No more messages found.");
            break;
          }
          if (flat.length > 0) {
            beforeId = oldestId(flat);
            continue;
          }
          break;
        }
        consecutiveEmpty = 0;

        setStats((s) => ({ ...s, found: s.found + fresh.length }));
        pushLog("info", `Found ${fresh.length} message(s) in this page.`);

        const deletable = fresh.filter((m) => isDeletable(m));
        const skipped = fresh.length - deletable.length;
        if (skipped > 0) {
          setStats((s) => ({ ...s, skipped: s.skipped + skipped }));
          pushLog("info", `Skipped ${skipped} system/pinned message(s).`);
        }

        setWipeState("deleting");
        for (const m of deletable) {
          while (pauseRef.current && !stopRef.current) {
            setWipeState("paused");
            await delay(250);
          }
          if (stopRef.current) break;
          setWipeState("deleting");

          const preview = m.content.replace(/\s+/g, " ").slice(0, 80) ||
            (m.attachments?.length ? `[${m.attachments.length} attachment(s)]` : "[empty]");

          if (dryRun) {
            pushLog("ok", `(dry) would delete ${m.id}: ${preview}`);
            setStats((s) => ({ ...s, deleted: s.deleted + 1 }));
            await delay(50);
            continue;
          }

          let attempts = 0;
          while (attempts < 5 && !stopRef.current) {
            attempts += 1;
            try {
              await deleteMessage(tok, m.channel_id, m.id);
              pushLog("ok", `Deleted ${m.id}: ${preview}`);
              setStats((s) => ({ ...s, deleted: s.deleted + 1 }));
              await delay(delayMs);
              break;
            } catch (err) {
              const e = err as DiscordError;
              if (e.status === 429 && e.retryAfterMs) {
                const wait = Math.ceil(e.retryAfterMs) + 100;
                pushLog(
                  "warn",
                  `Rate limited${e.isGlobal ? " (GLOBAL)" : ""}, waiting ${wait}ms (attempt ${attempts}/5)`,
                );
                await delay(wait);
                continue;
              }
              if (e.status === 404) {
                pushLog("info", `${m.id} already gone (404).`);
                break;
              }
              if (e.status === 403) {
                pushLog(
                  "warn",
                  `Forbidden on ${m.id} (no permission to delete here).`,
                );
                setStats((s) => ({ ...s, failed: s.failed + 1 }));
                break;
              }
              pushLog("error", `Failed ${m.id}: ${e.message}`);
              setStats((s) => ({ ...s, failed: s.failed + 1 }));
              await delay(Math.min(2000 * attempts, 8000));
            }
          }
        }

        beforeId = oldestId(fresh);
      }

      pushLog(
        stopRef.current ? "warn" : "ok",
        stopRef.current ? "Stopped by user." : "Wipe complete.",
      );
      setWipeState("done");
    } catch (err) {
      pushLog("error", `Unexpected error: ${(err as Error).message}`);
      setWipeState("done");
    }
  }

  const canStart =
    phase === "ready" &&
    !!guildId &&
    (wipeState === "idle" || wipeState === "done");
  const running = wipeState === "scanning" || wipeState === "deleting" || wipeState === "paused";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-discord-accent">Discord</span> Wiper
          </h1>
          <p className="mt-1 text-sm text-discord-muted">
            Delete your own messages from a specific server. Runs in your
            browser — your token is never stored.
          </p>
        </div>
        {me && (
          <div className="flex items-center gap-3">
            {avatarUrl(me) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl(me)!}
                alt=""
                className="h-9 w-9 rounded-full ring-1 ring-discord-border"
              />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-discord-border text-sm">
                {(me.global_name || me.username).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="text-right">
              <div className="text-sm font-medium">
                {me.global_name || me.username}
              </div>
              <button
                onClick={signOut}
                className="text-xs text-discord-muted hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <Warning />

      {phase === "auth" && (
        <section className="mt-6 rounded-xl border border-discord-border bg-discord-panel p-6">
          <h2 className="text-lg font-semibold">Connect your account</h2>
          <p className="mt-1 text-sm text-discord-muted">
            Paste your Discord <strong>user token</strong>. It is sent only with
            requests you initiate, used to call Discord's API, and discarded
            when you close the tab.
          </p>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-discord-muted">
            <li>Open Discord in your browser and press F12.</li>
            <li>
              Go to the <span className="text-white">Network</span> tab and
              filter for <code className="rounded bg-black/40 px-1">/api</code>.
            </li>
            <li>Send a message in any chat to trigger a request.</li>
            <li>
              Click a request, find the{" "}
              <code className="rounded bg-black/40 px-1">authorization</code>{" "}
              header in Request Headers, and copy its value.
            </li>
          </ol>

          <div className="mt-5">
            <label className="text-xs uppercase tracking-wide text-discord-muted">
              User token
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="paste token here"
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-discord-border bg-discord-bg px-3 py-2 font-mono text-sm outline-none focus:border-discord-accent"
              rows={3}
            />
          </div>

          {authError && (
            <div className="mt-3 rounded-lg border border-discord-danger/40 bg-discord-danger/10 px-3 py-2 text-sm text-red-200">
              {authError}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={login}
              disabled={authBusy || !token.trim()}
              className="rounded-lg bg-discord-accent px-4 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authBusy ? "Connecting..." : "Connect"}
            </button>
            <span className="text-xs text-discord-muted">
              Token stays in this tab. We never log or store it.
            </span>
          </div>
        </section>
      )}

      {phase === "ready" && (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr]">
          <div className="space-y-6">
            <Panel title="Server">
              <select
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                className="w-full rounded-lg border border-discord-border bg-discord-bg px-3 py-2 text-sm outline-none focus:border-discord-accent"
              >
                <option value="">— Select a server —</option>
                {guilds.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {selectedGuild && (
                <div className="mt-3 flex items-center gap-3">
                  {guildIconUrl(selectedGuild) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={guildIconUrl(selectedGuild)!}
                      alt=""
                      className="h-10 w-10 rounded-lg"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-discord-border text-sm">
                      {selectedGuild.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="font-medium">{selectedGuild.name}</div>
                    <div className="text-xs text-discord-muted">
                      ID {selectedGuild.id}
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            <Panel
              title="Channel (optional)"
              subtitle="Leave empty to wipe across all channels in the server."
            >
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                disabled={!channels.length}
                className="w-full rounded-lg border border-discord-border bg-discord-bg px-3 py-2 text-sm outline-none focus:border-discord-accent disabled:opacity-50"
              >
                <option value="">— All channels —</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </Panel>

            <Panel title="Options">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  Dry run
                  <span className="ml-2 text-xs text-discord-muted">
                    (preview only, no delete)
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4 accent-discord-accent"
                />
              </label>
              <label className="mt-4 block text-sm">
                <span className="flex items-center justify-between">
                  Delay between deletes
                  <span className="text-xs text-discord-muted">
                    {delayMs} ms
                  </span>
                </span>
                <input
                  type="range"
                  min={400}
                  max={4000}
                  step={100}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="mt-2 w-full accent-discord-accent"
                />
                <span className="text-xs text-discord-muted">
                  Higher = safer against rate limits.
                </span>
              </label>
            </Panel>

            <div className="space-y-2">
              {!running && (
                <button
                  disabled={!canStart}
                  onClick={() => {
                    if (dryRun) runWipe();
                    else setConfirmOpen(true);
                  }}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow disabled:cursor-not-allowed disabled:opacity-50 ${
                    dryRun
                      ? "bg-discord-accent text-white hover:brightness-110"
                      : "bg-discord-danger text-white hover:brightness-110"
                  }`}
                >
                  {dryRun ? "Start dry run" : "Wipe my messages"}
                </button>
              )}
              {running && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      pauseRef.current = !pauseRef.current;
                    }}
                    className="flex-1 rounded-lg border border-discord-border bg-discord-panel px-4 py-2 text-sm font-medium hover:bg-discord-border"
                  >
                    {wipeState === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => {
                      stopRef.current = true;
                      pauseRef.current = false;
                    }}
                    className="flex-1 rounded-lg bg-discord-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Panel title="Progress">
              <div className="grid grid-cols-4 gap-3 text-center text-sm">
                <Stat label="Found" value={stats.found} />
                <Stat
                  label={dryRun ? "Would delete" : "Deleted"}
                  value={stats.deleted}
                  tone="ok"
                />
                <Stat label="Skipped" value={stats.skipped} />
                <Stat label="Failed" value={stats.failed} tone="bad" />
              </div>
              <div className="mt-4 text-xs text-discord-muted">
                Status:{" "}
                <span className="font-medium text-white">{wipeState}</span>
              </div>
            </Panel>

            <Panel title="Log" pad={false}>
              <div className="max-h-[420px] overflow-auto px-4 py-3 font-mono text-xs">
                {logs.length === 0 && (
                  <div className="text-discord-muted">
                    Logs will appear here.
                  </div>
                )}
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className={`flex gap-2 py-0.5 ${logTone(l.level)}`}
                  >
                    <span className="shrink-0 text-discord-muted">
                      {l.time}
                    </span>
                    <span className="whitespace-pre-wrap break-words">
                      {l.msg}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      )}

      {confirmOpen && (
        <ConfirmDialog
          guildName={selectedGuild?.name || ""}
          channelName={selectedChannel ? `#${selectedChannel.name}` : "all channels"}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={runWipe}
        />
      )}

      <footer className="mt-10 text-center text-xs text-discord-muted">
        Self-bot automation may violate Discord's Terms of Service. Use at your
        own risk. Built for cleaning your own account.
      </footer>
    </main>
  );
}

function Warning() {
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
      <div className="font-semibold">Read me before continuing</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-yellow-100/90">
        <li>
          This tool acts on your account using your user token. Using user
          tokens for automation is considered a self-bot and may violate
          Discord's ToS.
        </li>
        <li>
          Your token is sent only in requests to Discord (relayed via this
          site's proxy to bypass CORS). It is not stored, logged, or kept after
          the tab closes.
        </li>
        <li>
          Deletions are permanent. Use <strong>Dry run</strong> first.
        </li>
      </ul>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  pad = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  pad?: boolean;
}) {
  return (
    <div className="rounded-xl border border-discord-border bg-discord-panel">
      <div className="border-b border-discord-border px-4 py-3">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-discord-muted">{subtitle}</div>
        )}
      </div>
      <div className={pad ? "p-4" : ""}>{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "bad";
}) {
  const color =
    tone === "ok"
      ? "text-discord-ok"
      : tone === "bad"
        ? "text-discord-danger"
        : "text-white";
  return (
    <div className="rounded-lg border border-discord-border bg-discord-bg px-3 py-3">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-discord-muted">{label}</div>
    </div>
  );
}

function logTone(level: LogEntry["level"]): string {
  switch (level) {
    case "ok":
      return "text-green-300";
    case "warn":
      return "text-yellow-300";
    case "error":
      return "text-red-300";
    default:
      return "text-discord-muted";
  }
}

function ConfirmDialog({
  guildName,
  channelName,
  onCancel,
  onConfirm,
}: {
  guildName: string;
  channelName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [text, setText] = useState("");
  const required = "WIPE";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-discord-border bg-discord-panel p-6 shadow-2xl">
        <h3 className="text-lg font-semibold">Permanently delete messages?</h3>
        <p className="mt-2 text-sm text-discord-muted">
          This will delete your messages in{" "}
          <strong className="text-white">{guildName}</strong> ({channelName}).
          Deletions cannot be undone.
        </p>
        <label className="mt-4 block text-sm">
          Type <code className="rounded bg-black/40 px-1">{required}</code> to
          confirm:
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 w-full rounded-lg border border-discord-border bg-discord-bg px-3 py-2 text-sm outline-none focus:border-discord-danger"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-discord-border bg-discord-panel px-4 py-2 text-sm hover:bg-discord-border"
          >
            Cancel
          </button>
          <button
            disabled={text !== required}
            onClick={onConfirm}
            className="rounded-lg bg-discord-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Wipe
          </button>
        </div>
      </div>
    </div>
  );
}

function oldestId(msgs: DiscordMessage[]): string | undefined {
  let oldest: string | undefined;
  for (const m of msgs) {
    if (!oldest || BigInt(m.id) < BigInt(oldest)) oldest = m.id;
  }
  return oldest;
}

function isDeletable(m: DiscordMessage): boolean {
  if (m.pinned) return false;
  if (m.type !== undefined) {
    const deletableTypes = new Set([0, 19, 20, 21, 23]);
    if (!deletableTypes.has(m.type)) return false;
  }
  return true;
}
