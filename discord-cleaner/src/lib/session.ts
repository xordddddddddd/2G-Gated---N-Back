import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { DiscordUser } from "./types";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: DiscordUser;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "development-only-secret-min-32-chars!!",
  cookieName: "discord_cleaner_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
