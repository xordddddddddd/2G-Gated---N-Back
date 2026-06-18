import { NextRequest } from "next/server";
import { getGuilds, wipeGuildMessages } from "@/lib/discord";
import { getSession } from "@/lib/session";
import type { WipeEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.accessToken || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    guildIds?: string[];
    deleteDelayMs?: number;
    searchDelayMs?: number;
  };

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const guildIds = body.guildIds ?? [];
  if (guildIds.length === 0) {
    return new Response("No servers selected", { status: 400 });
  }

  const deleteDelayMs = Math.max(300, body.deleteDelayMs ?? 1000);
  const searchDelayMs = Math.max(1000, body.searchDelayMs ?? 5000);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: WipeEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        const guilds = await getGuilds(session.accessToken!);
        const selected = guilds.filter((g) => guildIds.includes(g.id));

        if (selected.length === 0) {
          send({ type: "error", message: "No matching servers found" });
          controller.close();
          return;
        }

        send({
          type: "status",
          message: `Starting wipe across ${selected.length} server(s)…`,
        });

        let totalDeleted = 0;

        for (const guild of selected) {
          try {
            const count = await wipeGuildMessages(
              session.accessToken!,
              session.user!.id,
              guild,
              { deleteDelayMs, searchDelayMs },
              send,
            );
            totalDeleted += count;
          } catch (error) {
            send({
              type: "error",
              guildId: guild.id,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to wipe server",
            });
          }
        }

        send({
          type: "complete",
          totalDeleted,
          guildsProcessed: selected.length,
        });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Wipe failed unexpectedly",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
