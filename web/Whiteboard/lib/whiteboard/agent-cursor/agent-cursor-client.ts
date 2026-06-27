import type { AgentCursorEngine } from "./agent-cursor-engine";

export type AgentCursorClientOptions = {
  readonly engine: AgentCursorEngine;
  readonly url?: string;
  readonly reconnectDelay?: number;
  readonly maxReconnectDelay?: number;
};

export function createAgentCursorClient(options: AgentCursorClientOptions) {
  const {
    engine,
    url = defaultWebSocketUrl(),
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
  } = options;

  let ws: WebSocket | null = null;
  let closed = false;
  let currentDelay = reconnectDelay;

  function connect(): void {
    if (closed) return;

    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      engine.setConnected(true);
      currentDelay = reconnectDelay;
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        engine.parse(event.data);
      }
    };

    ws.onclose = () => {
      engine.setConnected(false);
      ws = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function scheduleReconnect(): void {
    if (closed) return;
    setTimeout(() => {
      currentDelay = Math.min(currentDelay * 1.5, maxReconnectDelay);
      connect();
    }, currentDelay);
  }

  function send(data: string): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }

  function disconnect(): void {
    closed = true;
    ws?.close();
    ws = null;
    engine.setConnected(false);
  }

  return { connect, disconnect, send };
}

function defaultWebSocketUrl(): string {
  return "ws://localhost:3001";
}
