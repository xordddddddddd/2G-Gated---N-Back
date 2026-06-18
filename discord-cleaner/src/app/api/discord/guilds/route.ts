import { NextResponse } from "next/server";
import { getGuilds } from "@/lib/discord";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const guilds = await getGuilds(session.accessToken);
    return NextResponse.json({ guilds });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch guilds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
