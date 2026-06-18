import { NextRequest, NextResponse } from "next/server";

// This route is a thin, stateless pass-through to the Discord API. It exists only
// to get around browser CORS restrictions (Discord does not send permissive CORS
// headers for arbitrary origins). The user's token is read from a request header,
// forwarded to Discord, and NEVER stored, logged, or persisted anywhere.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISCORD_API = "https://discord.com/api/v10";

// Only allow a small, known set of Discord endpoints so this proxy can't be used
// as an open relay against the rest of Discord's API.
const ALLOWED_PATTERNS: RegExp[] = [
  /^users\/@me$/,
  /^users\/@me\/guilds$/,
  /^users\/@me\/channels$/,
  /^guilds\/\d+\/messages\/search(\?.*)?$/,
  /^channels\/\d+\/messages(\?.*)?$/,
  /^channels\/\d+\/messages\/\d+$/,
];

function buildTargetPath(pathParts: string[], search: string): string | null {
  // The whitelist below restricts every segment to safe, known values (numeric
  // IDs, "@me", and fixed keywords), so joining the raw parts is safe and avoids
  // mangling "@me" into "%40me".
  const joined = pathParts.join("/");
  const candidate = search ? `${joined}${search}` : joined;
  const isAllowed = ALLOWED_PATTERNS.some((re) => re.test(candidate));
  return isAllowed ? candidate : null;
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const token = req.headers.get("x-discord-token");
  if (!token) {
    return NextResponse.json(
      { error: "Missing token. Provide it in the x-discord-token header." },
      { status: 400 }
    );
  }

  const search = req.nextUrl.search; // includes leading "?" or ""
  const targetPath = buildTargetPath(pathParts, search);
  if (!targetPath) {
    return NextResponse.json(
      { error: "This endpoint is not permitted by the proxy." },
      { status: 403 }
    );
  }

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "DELETE") {
    body = await req.text();
  }

  let discordRes: Response;
  try {
    discordRes = await fetch(`${DISCORD_API}/${targetPath}`, {
      method: req.method,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        // A realistic UA reduces the chance of Discord/Cloudflare blocking.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Discord. Try again." },
      { status: 502 }
    );
  }

  const text = await discordRes.text();
  const res = new NextResponse(text, { status: discordRes.status });

  // Pass through the bits the client needs for rate-limit handling.
  const passthrough = [
    "content-type",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "x-ratelimit-reset-after",
    "x-ratelimit-bucket",
    "x-ratelimit-global",
    "x-ratelimit-scope",
    "retry-after",
  ];
  for (const h of passthrough) {
    const v = discordRes.headers.get(h);
    if (v) res.headers.set(h, v);
  }
  return res;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
