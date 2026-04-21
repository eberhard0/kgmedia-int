import { runAmplificationScan } from "@/lib/amplification";

export const maxDuration = 300;

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send({ type: "start" });
        const summary = await runAmplificationScan((msg) => {
          send({ type: "progress", message: msg });
        });
        send({ type: "complete", summary, scanned_at: new Date().toISOString() });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
