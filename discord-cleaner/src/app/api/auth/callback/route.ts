import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  getCurrentUser,
} from "@/lib/discord";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/?error=invalid_oauth_state`);
  }

  try {
    const tokens = await exchangeCode(code);
    const user = await getCurrentUser(tokens.access_token);

    const session = await getSession();
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.expiresAt = Date.now() + tokens.expires_in * 1000;
    session.user = user;
    await session.save();

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(message)}`,
    );
  }
}
