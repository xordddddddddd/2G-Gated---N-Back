import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const DISCORD_API = "https://discord.com/api/v9";

const ALLOWED_PATHS: Array<RegExp> = [
  /^\/users\/@me$/,
  /^\/users\/@me\/guilds$/,
  /^\/guilds\/\d+\/channels$/,
  /^\/guilds\/\d+\/messages\/search(\?.*)?$/,
  /^\/channels\/\d+\/messages\/\d+$/,
  /^\/channels\/\d+\/messages(\?.*)?$/,
];

function isAllowed(path: string): boolean {
  return ALLOWED_PATHS.some((re) => re.test(path));
}

async function proxy(req: NextRequest) {
  const auth = req.headers.get("x-discord-auth");
  if (!auth) {
    return NextResponse.json(
      { error: "Missing x-discord-auth header" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path || !path.startsWith("/")) {
    return NextResponse.json(
      { error: "Missing or invalid 'path' query param" },
      { status: 400 },
    );
  }
  if (!isAllowed(path)) {
    return NextResponse.json(
      { error: `Path not allowed by proxy: ${path}` },
      { status: 403 },
    );
  }

  const headers: Record<string, string> = {
    Authorization: auth,
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (DiscordWiper; +https://github.com/) Chrome/124 Safari/537.36",
    "X-Super-Properties":
      "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyNC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTI0LjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwic2VhcmNoX2VuZ2luZSI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjI0MzQwMSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=",
  };

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const body = await req.text();
      if (body) init.body = body;
    } catch {
      // no body
    }
  }

  const discordRes = await fetch(`${DISCORD_API}${path}`, init);

  const respHeaders = new Headers();
  const passHeaders = [
    "x-ratelimit-bucket",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "x-ratelimit-reset-after",
    "x-ratelimit-scope",
    "x-ratelimit-global",
    "retry-after",
  ];
  for (const h of passHeaders) {
    const v = discordRes.headers.get(h);
    if (v) respHeaders.set(h, v);
  }

  const text = await discordRes.text();
  respHeaders.set(
    "content-type",
    discordRes.headers.get("content-type") ?? "application/json",
  );

  return new NextResponse(text, {
    status: discordRes.status,
    headers: respHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const PUT = proxy;
