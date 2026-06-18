import { useState, useCallback, useRef, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscordUser {
  id: string
  username: string
  global_name?: string
  discriminator: string
  avatar: string | null
}

interface Guild {
  id: string
  name: string
  icon: string | null
}

interface DiscordMessage {
  id: string
  channel_id: string
  content: string
  author: { id: string }
}

type GuildStatus = 'pending' | 'running' | 'done' | 'skipped'

interface GuildResult {
  id: string
  name: string
  deleted: number
  failed: number
  status: GuildStatus
}

type LogType = 'info' | 'success' | 'error' | 'warn'
interface LogEntry {
  time: string
  text: string
  type: LogType
}

type Phase = 'token' | 'guilds' | 'wiping' | 'done'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function avatarUrl(user: DiscordUser) {
  if (!user.avatar) return null
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
}

function guildIconUrl(guild: Guild) {
  if (!guild.icon) return null
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
}

function guildInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function displayName(user: DiscordUser) {
  return user.global_name || user.username
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LogBadge({ type }: { type: LogType }) {
  const styles: Record<LogType, string> = {
    info: 'bg-[#3a3f47] text-[#b9bbbe]',
    success: 'bg-[#1e3a2a] text-[#57f287]',
    error: 'bg-[#3a1e1e] text-[#ed4245]',
    warn: 'bg-[#3a2e1a] text-[#fee75c]',
  }
  const labels: Record<LogType, string> = {
    info: 'INFO',
    success: 'OK',
    error: 'ERR',
    warn: 'WARN',
  }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}

function GuildIcon({ guild }: { guild: Guild }) {
  const [err, setErr] = useState(false)
  const src = guildIconUrl(guild)
  if (!src || err) {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#5865f2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {guildInitials(guild.name)}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={guild.name}
      className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
      onError={() => setErr(true)}
    />
  )
}

function StatusIcon({ status }: { status: GuildStatus }) {
  if (status === 'running') {
    return (
      <span className="inline-block w-4 h-4 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
    )
  }
  if (status === 'done') {
    return <span className="text-[#57f287] text-base">&#x2713;</span>
  }
  if (status === 'skipped') {
    return <span className="text-[#b9bbbe] text-base">&#x2014;</span>
  }
  return <span className="text-[#4f545c] text-base">&#xB7;</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DiscordWiper() {
  const [phase, setPhase] = useState<Phase>('token')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<DiscordUser | null>(null)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<GuildResult[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [totalDeleted, setTotalDeleted] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  const isPausedRef = useRef(false)
  const isStoppedRef = useRef(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isStopped, setIsStopped] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = useCallback((text: string, type: LogType = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs((prev) => [...prev.slice(-300), { time, text, type }])
  }, [])

  const handleConnect = async () => {
    if (!token.trim()) return
    setLoading(true)
    setError(null)
    try {
      const meRes = await fetch('/api/me', {
        headers: { 'x-discord-token': token.trim() },
      })
      const meData = await meRes.json()
      if (!meRes.ok) {
        setError(meData.message || `Authentication failed (${meRes.status})`)
        return
      }
      setUser(meData)

      const guildRes = await fetch('/api/guilds', {
        headers: { 'x-discord-token': token.trim() },
      })
      const guildData = await guildRes.json()
      if (!guildRes.ok) {
        setError(guildData.message || 'Failed to fetch servers')
        return
      }
      setGuilds(guildData)
      setPhase('guilds')
    } catch {
      setError('Network error — could not reach the server')
    } finally {
      setLoading(false)
    }
  }

  const toggleGuild = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(guilds.map((g) => g.id)))
  const deselectAll = () => setSelected(new Set())

  const handleStartWipe = async () => {
    if (selected.size === 0 || !user) return
    setShowConfirm(false)
    isPausedRef.current = false
    isStoppedRef.current = false
    setIsPaused(false)
    setIsStopped(false)
    setLogs([])
    setTotalDeleted(0)

    const toWipe = guilds.filter((g) => selected.has(g.id))
    const initial: GuildResult[] = toWipe.map((g) => ({
      id: g.id,
      name: g.name,
      deleted: 0,
      failed: 0,
      status: 'pending',
    }))
    setResults(initial)
    setPhase('wiping')

    let overallDeleted = 0

    for (const guild of toWipe) {
      if (isStoppedRef.current) {
        setResults((prev) =>
          prev.map((r) =>
            r.status === 'pending' ? { ...r, status: 'skipped' } : r,
          ),
        )
        break
      }

      setResults((prev) =>
        prev.map((r) => (r.id === guild.id ? { ...r, status: 'running' } : r)),
      )
      addLog(`Starting "${guild.name}"`, 'info')

      let guildDeleted = 0
      let guildFailed = 0
      const seenIds = new Set<string>()
      let moreMessages = true

      while (moreMessages && !isStoppedRef.current) {
        while (isPausedRef.current && !isStoppedRef.current) {
          await sleep(400)
        }
        if (isStoppedRef.current) break

        let searchData: { messages?: DiscordMessage[][]; total_results?: number }
        try {
          const searchRes = await fetch(
            `/api/search?guildId=${guild.id}&authorId=${user.id}`,
            { headers: { 'x-discord-token': token } },
          )

          if (searchRes.status === 429) {
            const retryAfter = Number(searchRes.headers.get('retry-after') || '1')
            addLog(`Search rate-limited, waiting ${retryAfter}s...`, 'warn')
            await sleep(retryAfter * 1000 + 500)
            continue
          }

          if (!searchRes.ok) {
            const errData = await searchRes.json().catch(() => ({}))
            addLog(
              `Search error in "${guild.name}": ${(errData as {message?: string}).message || searchRes.status}`,
              'error',
            )
            moreMessages = false
            break
          }

          searchData = await searchRes.json()
        } catch {
          addLog(`Network error searching "${guild.name}"`, 'error')
          break
        }

        const groups: DiscordMessage[][] = searchData.messages ?? []
        const messages = groups
          .flat()
          .filter((m) => m.author?.id === user.id && !seenIds.has(m.id))

        if (messages.length === 0) {
          addLog(`No more messages in "${guild.name}"`, 'info')
          break
        }

        addLog(`Found ${messages.length} message(s) — deleting...`, 'info')

        for (const msg of messages) {
          if (isStoppedRef.current) break
          while (isPausedRef.current && !isStoppedRef.current) await sleep(400)
          if (isStoppedRef.current) break

          seenIds.add(msg.id)

          let attempts = 0
          let deleted = false

          while (attempts < 3 && !deleted && !isStoppedRef.current) {
            attempts++
            try {
              const delRes = await fetch(
                `/api/delete?channelId=${msg.channel_id}&messageId=${msg.id}`,
                { method: 'DELETE', headers: { 'x-discord-token': token } },
              )

              if (delRes.status === 204) {
                deleted = true
                guildDeleted++
                overallDeleted++
                setTotalDeleted(overallDeleted)
                setResults((prev) =>
                  prev.map((r) =>
                    r.id === guild.id ? { ...r, deleted: guildDeleted } : r,
                  ),
                )
                addLog(
                  `Deleted msg ...${msg.id.slice(-6)} in ch ...${msg.channel_id.slice(-6)}`,
                  'success',
                )
              } else if (delRes.status === 429) {
                const retryAfter = Number(
                  delRes.headers.get('retry-after') || '1',
                )
                addLog(`Delete rate-limited, waiting ${retryAfter}s...`, 'warn')
                await sleep(retryAfter * 1000 + 500)
              } else {
                const errData = await delRes.json().catch(() => ({}))
                addLog(
                  `Failed msg ...${msg.id.slice(-6)}: ${(errData as {message?: string}).message || delRes.status}`,
                  'error',
                )
                guildFailed++
                setResults((prev) =>
                  prev.map((r) =>
                    r.id === guild.id ? { ...r, failed: guildFailed } : r,
                  ),
                )
                break
              }
            } catch {
              addLog(`Network error deleting msg ...${msg.id.slice(-6)}`, 'error')
              guildFailed++
              break
            }
          }

          // Respect Discord rate-limit: ~1 deletion per second
          await sleep(1100)
        }

        await sleep(600)
      }

      const finalStatus: GuildStatus = isStoppedRef.current ? 'skipped' : 'done'
      setResults((prev) =>
        prev.map((r) => (r.id === guild.id ? { ...r, status: finalStatus } : r)),
      )
      addLog(
        `Finished "${guild.name}": ${guildDeleted} deleted, ${guildFailed} failed`,
        guildFailed > 0 ? 'warn' : 'success',
      )
    }

    setPhase('done')
    addLog('Wipe complete.', 'success')
  }

  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current
    setIsPaused(isPausedRef.current)
  }

  const handleStop = () => {
    isStoppedRef.current = true
    isPausedRef.current = false
    setIsStopped(true)
    setIsPaused(false)
  }

  return (
    <div className="min-h-dvh bg-[#0d0e10] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1e2025] px-6 py-3 flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 127.14 96.36" fill="#5865f2">
          <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
        </svg>
        <span className="font-semibold text-base tracking-tight text-white/90">
          Discord Message Wiper
        </span>
        {user && phase !== 'token' && (
          <div className="ml-auto flex items-center gap-2 text-sm text-[#b9bbbe]">
            {avatarUrl(user) ? (
              <img
                src={avatarUrl(user)!}
                alt={displayName(user)}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#5865f2] flex items-center justify-center text-xs font-bold">
                {displayName(user)[0]?.toUpperCase()}
              </div>
            )}
            <span>{displayName(user)}</span>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">

        {/* Token phase */}
        {phase === 'token' && (
          <div className="w-full max-w-md space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">Connect your account</h1>
              <p className="text-[#b9bbbe] text-sm">
                Enter your Discord user token to get started
              </p>
            </div>

            <div className="rounded-lg border border-[#fee75c]/30 bg-[#fee75c]/5 px-4 py-3 text-[#fee75c] text-sm flex gap-2">
              <span className="flex-shrink-0 mt-0.5">&#9888;</span>
              <span>
                Your token grants full access to your account. Never share it.
                This tool only uses it to read and delete your own messages.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#dcddde]">
                User Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  placeholder="Paste your token here..."
                  className="w-full bg-[#1e2025] border border-[#2d3036] rounded-lg px-4 py-3 pr-12 text-sm text-white placeholder-[#4f545c] focus:outline-none focus:border-[#5865f2] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-white transition-colors text-xs"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[#ed4245] text-sm bg-[#ed4245]/10 border border-[#ed4245]/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              onClick={handleConnect}
              disabled={!token.trim() || loading}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>

            <div className="rounded-lg border border-[#2d3036] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#b9bbbe] hover:bg-[#1e2025] transition-colors"
              >
                <span>How do I get my token?</span>
                <span>{showHelp ? '▴' : '▾'}</span>
              </button>
              {showHelp && (
                <div className="px-4 pb-4 text-sm text-[#b9bbbe] space-y-2 border-t border-[#2d3036] pt-3">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Open Discord in your browser (discord.com/app)</li>
                    <li>Press <kbd className="bg-[#2d3036] px-1.5 py-0.5 rounded text-xs font-mono">F12</kbd> to open DevTools</li>
                    <li>Go to the <strong className="text-white">Network</strong> tab</li>
                    <li>Send any message or navigate to a server</li>
                    <li>Click any request to <code className="text-[#57f287] font-mono text-xs">discord.com/api</code></li>
                    <li>Find <code className="text-[#57f287] font-mono text-xs">Authorization</code> in Request Headers</li>
                    <li>Copy that value — that is your token</li>
                  </ol>
                  <p className="text-[#fee75c] text-xs mt-2">
                    Note: Self-bots may violate Discord's Terms of Service. Use at your own risk.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guilds phase */}
        {phase === 'guilds' && (
          <div className="w-full max-w-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Select Servers</h2>
                <p className="text-[#b9bbbe] text-sm mt-0.5">
                  Choose which servers to wipe your messages from
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={deselectAll}
                  className="text-xs text-[#b9bbbe] hover:text-white px-3 py-1.5 border border-[#2d3036] rounded-lg hover:border-[#4f545c] transition-colors"
                >
                  None
                </button>
                <button
                  onClick={selectAll}
                  className="text-xs text-[#b9bbbe] hover:text-white px-3 py-1.5 border border-[#2d3036] rounded-lg hover:border-[#4f545c] transition-colors"
                >
                  All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[calc(100dvh-280px)] overflow-y-auto pr-1">
              {guilds.map((guild) => {
                const isSelected = selected.has(guild.id)
                return (
                  <button
                    key={guild.id}
                    onClick={() => toggleGuild(guild.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-[#5865f2] bg-[#5865f2]/10'
                        : 'border-[#2d3036] bg-[#16181c] hover:border-[#4f545c] hover:bg-[#1e2025]'
                    }`}
                  >
                    <GuildIcon guild={guild} />
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">
                      {guild.name}
                    </span>
                    <span
                      className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#5865f2] border-[#5865f2]'
                          : 'border-[#4f545c]'
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4l3 3 5-6"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1e2025]">
              <p className="text-sm text-[#72767d]">
                {selected.size} server{selected.size !== 1 ? 's' : ''} selected
              </p>
              <button
                disabled={selected.size === 0}
                onClick={() => setShowConfirm(true)}
                className="bg-[#ed4245] hover:bg-[#c0393b] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                Start Wipe
              </button>
            </div>
          </div>
        )}

        {/* Wiping / Done phase */}
        {(phase === 'wiping' || phase === 'done') && results.length > 0 && (
          <div className="w-full max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {phase === 'wiping' ? 'Wiping messages...' : 'Wipe complete'}
                </h2>
                <p className="text-[#b9bbbe] text-sm mt-0.5">
                  {totalDeleted} message{totalDeleted !== 1 ? 's' : ''} deleted
                  {isStopped ? ' (stopped early)' : ''}
                </p>
              </div>
              {phase === 'wiping' && (
                <div className="flex gap-2">
                  <button
                    onClick={togglePause}
                    className="text-xs text-[#b9bbbe] hover:text-white px-3 py-1.5 border border-[#2d3036] rounded-lg hover:border-[#4f545c] transition-colors"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleStop}
                    className="text-xs text-[#ed4245] hover:text-white px-3 py-1.5 border border-[#ed4245]/40 rounded-lg hover:bg-[#ed4245] hover:border-[#ed4245] transition-colors"
                  >
                    Stop
                  </button>
                </div>
              )}
              {phase === 'done' && (
                <button
                  onClick={() => {
                    setPhase('guilds')
                    setResults([])
                    setLogs([])
                    setTotalDeleted(0)
                    setSelected(new Set())
                  }}
                  className="text-xs text-[#b9bbbe] hover:text-white px-3 py-1.5 border border-[#2d3036] rounded-lg hover:border-[#4f545c] transition-colors"
                >
                  Back
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#16181c] border border-[#1e2025]"
                >
                  <StatusIcon status={r.status} />
                  <span className="text-sm flex-1 truncate">{r.name}</span>
                  {(r.deleted > 0 || r.status === 'done') && (
                    <span className="text-xs text-[#57f287]">
                      {r.deleted} deleted
                    </span>
                  )}
                  {r.failed > 0 && (
                    <span className="text-xs text-[#ed4245]">
                      {r.failed} failed
                    </span>
                  )}
                  {r.status === 'pending' && (
                    <span className="text-xs text-[#72767d]">waiting</span>
                  )}
                  {r.status === 'skipped' && (
                    <span className="text-xs text-[#72767d]">skipped</span>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-[#0a0b0d] border border-[#1e2025] overflow-hidden">
              <div className="px-4 py-2 border-b border-[#1e2025] flex items-center gap-2">
                <span className="text-xs font-medium text-[#72767d] uppercase tracking-wider">
                  Activity Log
                </span>
                <span className="text-xs text-[#4f545c]">({logs.length} entries)</span>
              </div>
              <div className="h-48 overflow-y-auto p-3 font-mono space-y-1">
                {logs.length === 0 && (
                  <p className="text-xs text-[#4f545c] italic">Starting...</p>
                )}
                {logs.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-[#4f545c] flex-shrink-0 tabular-nums">
                      {entry.time}
                    </span>
                    <LogBadge type={entry.type} />
                    <span
                      className={
                        entry.type === 'success'
                          ? 'text-[#57f287]'
                          : entry.type === 'error'
                            ? 'text-[#ed4245]'
                            : entry.type === 'warn'
                              ? 'text-[#fee75c]'
                              : 'text-[#b9bbbe]'
                      }
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            {phase === 'done' && (
              <div className="rounded-lg bg-[#1e3a2a] border border-[#57f287]/30 px-5 py-4 text-center">
                <p className="text-[#57f287] font-semibold text-lg">
                  All done! {totalDeleted} message{totalDeleted !== 1 ? 's' : ''} deleted.
                </p>
                {results.some((r) => r.failed > 0) && (
                  <p className="text-[#fee75c] text-sm mt-1">
                    Some messages could not be deleted. You can only delete your own messages.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-[#1e2025] border border-[#2d3036] rounded-xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-[#ed4245]">Confirm Wipe</h3>
              <p className="text-[#b9bbbe] text-sm mt-2">
                This will permanently delete all of your messages from{' '}
                <strong className="text-white">{selected.size}</strong> server
                {selected.size !== 1 ? 's' : ''}. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#2d3036] text-[#b9bbbe] hover:text-white hover:border-[#4f545c] text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartWipe}
                className="flex-1 py-2.5 rounded-lg bg-[#ed4245] hover:bg-[#c0393b] text-white font-semibold text-sm transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
