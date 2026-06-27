import { WebSocket, WebSocketServer } from "ws";

export type AgentCursorServerOptions = {
  readonly wss: WebSocketServer;
  readonly onMessage?: (data: string, client: WebSocket) => void;
};

export type AgentCursorServerHandler = ReturnType<typeof createAgentCursorWebSocketHandler>;

export function createAgentCursorWebSocketHandler(
  options: AgentCursorServerOptions,
) {
  const { wss, onMessage } = options;

  const broadcast = (message: string, exclude?: WebSocket): void => {
    for (const client of wss.clients) {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  };

  return {
    handleConnection(ws: WebSocket): void {
      ws.on("message", (raw: WebSocket.Data) => {
        const data = typeof raw === "string" ? raw : raw.toString();
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }
          if (parsed.type === "broadcast") {
            broadcast(JSON.stringify(parsed.payload), ws);
            return;
          }
          onMessage?.(data, ws);
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        }
      });
    },

    broadcast,
  };
}
