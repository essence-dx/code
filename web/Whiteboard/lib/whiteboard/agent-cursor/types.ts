import type { WhiteboardCommand } from "../commands";
import type { WhiteboardPoint, WhiteboardTool } from "../model";

export type AgentCursorCommand =
  | { readonly type: "move"; readonly x: number; readonly y: number }
  | { readonly type: "moveToScreen"; readonly x: number; readonly y: number }
  | { readonly type: "pointerDown"; readonly button?: number }
  | { readonly type: "pointerUp" }
  | { readonly type: "click"; readonly x?: number; readonly y?: number; readonly button?: number }
  | { readonly type: "setTool"; readonly tool: WhiteboardTool }
  | { readonly type: "keyDown"; readonly key: string }
  | { readonly type: "type"; readonly text: string }
  | { readonly type: "wheel"; readonly deltaX: number; readonly deltaY: number }
  | { readonly type: "command"; readonly command: WhiteboardCommand }
  | { readonly type: "commands"; readonly commands: readonly WhiteboardCommand[] }
  | { readonly type: "wait"; readonly ms: number }
  | { readonly type: "batch"; readonly commands: readonly AgentCursorCommand[] }
  | { readonly type: "drawRect"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly type: "drawEllipse"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly type: "drawDiamond"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly type: "drawLine"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly type: "drawArrow"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly type: "drawFreehand"; readonly points: readonly WhiteboardPoint[] }
  | { readonly type: "select"; readonly x: number; readonly y: number }
  | { readonly type: "selectAll" }
  | { readonly type: "delete" }
  | { readonly type: "addText"; readonly x: number; readonly y: number; readonly text: string };

export interface AgentCursorState {
  readonly worldX: number;
  readonly worldY: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly visible: boolean;
  readonly connected: boolean;
}

export type AgentCursorListener = (state: AgentCursorState) => void;
