import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/discord";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session.accessToken || !session.user) {
    return NextResponse.json({ authenticated: false });
  }

  if (session.expiresAt && session.expiresAt < Date.now() + 60_000) {
    if (session.refreshToken) {
      try {
        const tokens = await refreshAccessToken(session.refreshToken);
        session.accessToken = tokens.access_token;
        session.refreshToken = tokens.refresh_token;
        session.expiresAt = Date.now() + tokens.expires_in * 1000;
        await session.save();
      } catch {
        session.destroy();
        return NextResponse.json({ authenticated: false });
      }
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
  });
}
