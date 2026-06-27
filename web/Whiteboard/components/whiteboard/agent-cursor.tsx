import { useEffect, useState } from "react";
import type { AgentCursorEngine, AgentCursorState } from "../../lib/whiteboard/agent-cursor";

export type AgentCursorOverlayProps = {
  readonly engine: AgentCursorEngine;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
};

export function AgentCursorOverlay({ engine, canvasWidth, canvasHeight }: AgentCursorOverlayProps) {
  const [cursor, setCursor] = useState<AgentCursorState>({
    worldX: 0,
    worldY: 0,
    screenX: 0,
    screenY: 0,
    visible: false,
    connected: false,
  });

  useEffect(() => {
    const unsub = engine.subscribe((state) => setCursor(state));
    return unsub;
  }, [engine]);

  const isVisible = cursor.visible && cursor.connected;

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="wb-agent-cursor"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: "none",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <svg
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {isVisible && (
          <g
            transform={`translate(${cursor.screenX}, ${cursor.screenY})`}
            style={{ transition: "transform 0.08s linear" }}
          >
            <circle
              r={8}
              fill="none"
              stroke="hsl(330 100% 60%)"
              strokeWidth={2.5}
              opacity={0.9}
            />
            <circle
              r={2}
              fill="hsl(330 100% 60%)"
              opacity={0.9}
            />
            <line
              x1={0} y1={-12}
              x2={0} y2={12}
              stroke="hsl(330 100% 60%)"
              strokeWidth={1.5}
              opacity={0.6}
            />
            <line
              x1={-12} y1={0}
              x2={12} y2={0}
              stroke="hsl(330 100% 60%)"
              strokeWidth={1.5}
              opacity={0.6}
            />
            <circle
              r={20}
              fill="hsl(330 100% 60%)"
              opacity={0.08}
            />
          </g>
        )}
        {cursor.connected && (
          <circle
            cx={8}
            cy={canvasHeight - 8}
            r={4}
            fill="hsl(145 70% 50%)"
          />
        )}
      </svg>
    </div>
  );
}
