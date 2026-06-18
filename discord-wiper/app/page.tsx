"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DiscordChannel,
  DiscordGuild,
  DiscordUser,
  Filters,
  getDmChannels,
  getGuilds,
  getMe,
  HttpError,
  LogLevel,
  runWipe,
  WipeStats,
  WipeTarget,
} from "@/lib/discord";

type Phase = "auth" | "ready" | "running";
type LogEntry = { id: number; level: LogLevel; message: string; time: string };

const dmLabel = (c: DiscordChannel): string => {
  if (c.name) return c.name;
  const names = (c.recipients || []).map((r) => r.global_name || r.username);
  if (names.length) return names.join(", ");
  return `Channel ${c.id}`;
};

export default function Home() {
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<Phase>("auth");
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState("");

  const [me, setMe] = useState<DiscordUser | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [dms, setDms] = useState<DiscordChannel[]>([]);

  const [targetKind, setTargetKind] = useState<"guild" | "channel">("guild");
  const [guildId, setGuildId] = useState("");
  const [dmId, setDmId] = useState("");
  const [channelRestrictId, setChannelRestrictId] = useState("");

  const [contentIncludes, setContentIncludes] = useState("");
  const [hasLink, setHasLink] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [afterDate, setAfterDate] = useState("");
  const [beforeDate, setBeforeDate] = useState("");

  const [deleteDelay, setDeleteDelay] = useState(1200);
  const [searchDelay, setSearchDelay] = useState(900);

  const [confirmed, setConfirmed] = useState(false);
  const [stats, setStats] = useState<WipeStats>({
    scanned: 0,
    deleted: 0,
    failed: 0,
    skipped: 0,
    total: null,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);
  const logIdRef = useRef(0);
  const logBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((level: LogLevel, message: string) => {
    setLogs((prev) => {
      const next = [
        ...prev,
        {
          id: logIdRef.current++,
          level,
          message,
          time: new Date().toLocaleTimeString(),
        },
      ];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
  }, []);

  const connect = useCallback(async () => {
    const trimmed = token.trim().replace(/^"|"$/g, "");
    if (!trimmed) return;
    setConnecting(true);
    setAuthError("");
    try {
      const user = await getMe(trimmed);
      const [g, d] = await Promise.all([
        getGuilds(trimmed).catch(() => [] as DiscordGuild[]),
        getDmChannels(trimmed).catch(() => [] as DiscordChannel[]),
      ]);
      g.sort((a, b) => a.name.localeCompare(b.name));
      setMe(user);
      setGuilds(g);
      setDms(d.filter((c) => c.type === 1 || c.type === 3));
      setToken(trimmed);
      setPhase("ready");
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : "Could not connect. Check your token and try again.";
      setAuthError(msg);
    } finally {
      setConnecting(false);
    }
  }, [token]);

  const disconnect = useCallback(() => {
    abortRef.current?.abort();
    setToken("");
    setMe(null);
    setGuilds([]);
    setDms([]);
    setPhase("auth");
    setConfirmed(false);
    setStats({ scanned: 0, deleted: 0, failed: 0, skipped: 0, total: null });
    setLogs([]);
  }, []);

  const selectedTarget: WipeTarget | null = useMemo(() => {
    if (targetKind === "guild") {
      const g = guilds.find((x) => x.id === guildId);
      return g ? { kind: "guild", id: g.id, name: g.name } : null;
    }
    const c = dms.find((x) => x.id === dmId);
    return c ? { kind: "channel", id: c.id, name: dmLabel(c) } : null;
  }, [targetKind, guildId, dmId, guilds, dms]);

  const start = useCallback(async () => {
    if (!selectedTarget || !me) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPaused(false);
    pausedRef.current = false;
    setStats({ scanned: 0, deleted: 0, failed: 0, skipped: 0, total: null });
    setPhase("running");

    const filters: Filters = {
      contentIncludes: contentIncludes.trim() || undefined,
      hasLink: hasLink || undefined,
      hasFile: hasFile || undefined,
      afterDate: afterDate || undefined,
      beforeDate: beforeDate || undefined,
      channelId:
        targetKind === "guild" && channelRestrictId.trim()
          ? channelRestrictId.trim()
          : undefined,
    };

    await runWipe(token, me.id, selectedTarget, filters, {
      onLog: addLog,
      onStats: setStats,
      signal: controller.signal,
      isPaused: () => pausedRef.current,
      deleteDelayMs: Math.max(300, deleteDelay),
      searchDelayMs: Math.max(200, searchDelay),
    });

    setPhase("ready");
    setPaused(false);
  }, [
    selectedTarget,
    me,
    token,
    contentIncludes,
    hasLink,
    hasFile,
    afterDate,
    beforeDate,
    targetKind,
    channelRestrictId,
    deleteDelay,
    searchDelay,
    addLog,
  ]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const running = phase === "running";

  return (
    <main className="container">
      <h1 className="title">Discord Message Wiper</h1>
      <p className="subtitle">
        Delete your own messages from a specific server or DM. Everything runs in your
        browser session — your token is forwarded to Discord through a stateless proxy and
        is never stored or logged.
      </p>

      <div className="warning">
        <strong>Read this before using.</strong> Discord has no official feature for bulk
        deleting your own messages, so this tool automates your account to do it. Automating
        a user account (&ldquo;self-botting&rdquo;) is against{" "}
        <a href="https://discord.com/terms" target="_blank" rel="noreferrer">
          Discord&rsquo;s Terms of Service
        </a>{" "}
        and <strong>can result in your account being suspended or banned</strong>. Deletions
        are permanent. Use a slow delete speed, only on your own account, and at your own
        risk.
      </div>

      {phase === "auth" && (
        <div className="card">
          <h2>Connect your account</h2>
          <label className="label" htmlFor="token">
            Discord user token
          </label>
          <input
            id="token"
            type="password"
            placeholder="Paste your token here"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            autoComplete="off"
          />
          <div className="btn-row">
            <button className="btn" onClick={connect} disabled={connecting || !token.trim()}>
              {connecting ? "Connecting…" : "Connect"}
            </button>
          </div>
          {authError && <div className="error-text">{authError}</div>}
          <details style={{ marginTop: 16 }}>
            <summary>How do I find my token?</summary>
            <p className="hint" style={{ lineHeight: 1.6 }}>
              In the Discord web app, open DevTools (F12) → Network tab → refresh → click any
              request to <code>discord.com/api</code> → find the{" "}
              <code>authorization</code> request header and copy its value. Treat this token
              like your password: anyone with it has full access to your account. This site
              never stores it — close the tab and it&rsquo;s gone.
            </p>
          </details>
        </div>
      )}

      {phase !== "auth" && me && (
        <>
          <div className="card">
            <h2>Account</h2>
            <div className="account">
              <div className="avatar">
                {(me.global_name || me.username || "?").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {me.global_name || me.username}
                </div>
                <div className="muted">@{me.username}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button className="btn ghost" onClick={disconnect} disabled={running}>
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>What to wipe</h2>
            <div className="btn-row" style={{ marginBottom: 14 }}>
              <button
                className={`btn ${targetKind === "guild" ? "" : "ghost"}`}
                onClick={() => setTargetKind("guild")}
                disabled={running}
              >
                Server
              </button>
              <button
                className={`btn ${targetKind === "channel" ? "" : "ghost"}`}
                onClick={() => setTargetKind("channel")}
                disabled={running}
              >
                Direct message
              </button>
            </div>

            {targetKind === "guild" ? (
              <>
                <label className="label">Server</label>
                <select
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  disabled={running}
                >
                  <option value="">Select a server…</option>
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <label className="label" style={{ marginTop: 12 }}>
                  Restrict to one channel (optional channel ID)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to wipe the whole server"
                  value={channelRestrictId}
                  onChange={(e) => setChannelRestrictId(e.target.value)}
                  disabled={running}
                />
                <p className="hint">
                  Whole-server wipes use Discord&rsquo;s search index, so very recent
                  messages may take a moment to appear.
                </p>
              </>
            ) : (
              <>
                <label className="label">Direct message</label>
                <select
                  value={dmId}
                  onChange={(e) => setDmId(e.target.value)}
                  disabled={running}
                >
                  <option value="">Select a DM…</option>
                  {dms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {dmLabel(c)}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="card">
            <h2>Filters (optional)</h2>
            <label className="label">Only messages containing this text</label>
            <input
              type="text"
              placeholder="e.g. a word or phrase"
              value={contentIncludes}
              onChange={(e) => setContentIncludes(e.target.value)}
              disabled={running}
            />
            <div className="row" style={{ marginTop: 12 }}>
              <div>
                <label className="label">After date</label>
                <input
                  type="date"
                  value={afterDate}
                  onChange={(e) => setAfterDate(e.target.value)}
                  disabled={running}
                />
              </div>
              <div>
                <label className="label">Before date</label>
                <input
                  type="date"
                  value={beforeDate}
                  onChange={(e) => setBeforeDate(e.target.value)}
                  disabled={running}
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={hasLink}
                  onChange={(e) => setHasLink(e.target.checked)}
                  disabled={running}
                />
                Only messages with links/embeds
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={hasFile}
                  onChange={(e) => setHasFile(e.target.checked)}
                  disabled={running}
                />
                Only messages with attachments
              </label>
            </div>

            <details style={{ marginTop: 16 }}>
              <summary>Advanced speed settings</summary>
              <div className="row" style={{ marginTop: 12 }}>
                <div>
                  <label className="label">Delay between deletes (ms)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={deleteDelay}
                    onChange={(e) =>
                      setDeleteDelay(Number(e.target.value.replace(/\D/g, "")) || 0)
                    }
                    disabled={running}
                  />
                </div>
                <div>
                  <label className="label">Delay between searches (ms)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={searchDelay}
                    onChange={(e) =>
                      setSearchDelay(Number(e.target.value.replace(/\D/g, "")) || 0)
                    }
                    disabled={running}
                  />
                </div>
              </div>
              <p className="hint">
                Lower delays are faster but more likely to trigger Discord rate limits (and
                look more like automation). 1000ms+ is recommended.
              </p>
            </details>
          </div>

          <div className="card">
            <h2>Run</h2>
            <div className="stats">
              <div className="stat">
                <div className="num">{stats.deleted}</div>
                <div className="lbl">Deleted</div>
              </div>
              <div className="stat">
                <div className="num">{stats.scanned}</div>
                <div className="lbl">Scanned</div>
              </div>
              <div className="stat">
                <div className="num">{stats.skipped}</div>
                <div className="lbl">Skipped</div>
              </div>
              <div className="stat">
                <div className="num">{stats.failed}</div>
                <div className="lbl">Failed</div>
              </div>
            </div>

            {!running && (
              <label className="checkbox" style={{ marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I understand this permanently deletes my messages and may violate
                Discord&rsquo;s ToS.
              </label>
            )}

            <div className="btn-row">
              {!running ? (
                <button
                  className="btn danger"
                  onClick={start}
                  disabled={!selectedTarget || !confirmed}
                >
                  Start wiping
                </button>
              ) : (
                <>
                  <button
                    className="btn ghost"
                    onClick={() => setPaused((p) => !p)}
                  >
                    {paused ? "Resume" : "Pause"}
                  </button>
                  <button className="btn danger" onClick={stop}>
                    Stop
                  </button>
                </>
              )}
            </div>
            {!selectedTarget && !running && (
              <p className="hint">Select a server or DM above to begin.</p>
            )}

            <div className="log" ref={logBoxRef} style={{ marginTop: 16 }}>
              {logs.length === 0 ? (
                <div className="log-line info">Activity will appear here…</div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className={`log-line ${l.level}`}>
                    [{l.time}] {l.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <p className="footer">
        Open source, runs entirely in your session. This tool is not affiliated with or
        endorsed by Discord. Only use it on your own account and messages.
      </p>
    </main>
  );
}
