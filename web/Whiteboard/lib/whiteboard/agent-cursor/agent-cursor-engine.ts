import type { WhiteboardCommand } from "../commands";
import { worldToScreen, screenToWorld } from "../render/geometry";
import type {
  WhiteboardInputController,
} from "../../stores/whiteboard-input-controller";
import { whiteboardStore, type WhiteboardStoreApi } from "../../stores/whiteboard-store";
import type {
  WhiteboardPoint,
  WhiteboardTool,
  WhiteboardViewport,
} from "../model";
import type {
  AgentCursorCommand,
  AgentCursorListener,
  AgentCursorState,
} from "./types";

const AGENT_POINTER_ID = 4242;

export type AgentCursorEngineOptions = {
  readonly inputController: WhiteboardInputController;
  readonly storeApi?: WhiteboardStoreApi;
  readonly idFactory?: () => string;
};

export class AgentCursorEngine {
  private worldX = 0;
  private worldY = 0;
  private viewport: WhiteboardViewport = { x: 0, y: 0, zoom: 1 };
  private visible = false;
  private connected = false;
  private listeners = new Set<AgentCursorListener>();
  private inputController: WhiteboardInputController;
  private storeApi: WhiteboardStoreApi;
  private idFactory: () => string;

  private unsubStore: (() => void) | null = null;

  constructor(options: AgentCursorEngineOptions) {
    this.inputController = options.inputController;
    this.storeApi = options.storeApi ?? whiteboardStore;
    this.idFactory = options.idFactory ?? (() => String(Date.now()));

    const doc = this.storeApi.getDocument();
    this.viewport = doc.viewport;

    this.unsubStore = this.storeApi.subscribe((state) => {
      this.viewport = state.document.viewport;
    });
  }

  destroy(): void {
    this.unsubStore?.();
    this.listeners.clear();
  }

  private notify(): void {
    const screen = worldToScreen({ x: this.worldX, y: this.worldY }, this.viewport);
    const state: AgentCursorState = {
      worldX: this.worldX,
      worldY: this.worldY,
      screenX: screen.x,
      screenY: screen.y,
      visible: this.visible,
      connected: this.connected,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  subscribe(fn: AgentCursorListener): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  getState(): AgentCursorState {
    const screen = worldToScreen({ x: this.worldX, y: this.worldY }, this.viewport);
    return {
      worldX: this.worldX,
      worldY: this.worldY,
      screenX: screen.x,
      screenY: screen.y,
      visible: this.visible,
      connected: this.connected,
    };
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
    this.notify();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.notify();
  }

  syncViewport(): void {
    const doc = this.storeApi.getDocument();
    this.viewport = doc.viewport;
    this.notify();
  }

  parse(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const cmd of parsed) {
          this.processCommand(cmd as AgentCursorCommand);
        }
        return true;
      }
      return this.processCommand(parsed as AgentCursorCommand);
    } catch {
      return false;
    }
  }

  processCommand(command: AgentCursorCommand): boolean {
    switch (command.type) {
      case "move":
        this.moveTo(command.x, command.y);
        return true;
      case "moveToScreen":
        this.moveToScreen(command.x, command.y);
        return true;
      case "pointerDown":
        this.pointerDown(command.button ?? 0);
        return true;
      case "pointerUp":
        this.pointerUp();
        return true;
      case "click":
        if (command.x !== undefined && command.y !== undefined) {
          this.moveTo(command.x, command.y);
        }
        this.click(command.button ?? 0);
        return true;
      case "setTool":
        this.setTool(command.tool);
        return true;
      case "keyDown":
        this.keyDown(command.key);
        return true;
      case "type":
        this.typeText(command.text);
        return true;
      case "wheel":
        this.wheel(command.deltaX, command.deltaY);
        return true;
      case "command":
        return this.dispatchCommand(command.command);
      case "commands":
        return this.dispatchCommands(command.commands);
      case "wait":
        return true;
      case "batch":
        for (const cmd of command.commands) {
          this.processCommand(cmd);
        }
        return true;
      case "drawRect":
        this.drawTool("rectangle", { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 });
        return true;
      case "drawEllipse":
        this.drawTool("ellipse", { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 });
        return true;
      case "drawDiamond":
        this.drawTool("diamond", { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 });
        return true;
      case "drawLine":
        this.drawTool("line", { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 });
        return true;
      case "drawArrow":
        this.drawTool("arrow", { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 });
        return true;
      case "drawFreehand":
        this.drawFreehand(command.points);
        return true;
      case "select":
        this.selectAt(command.x, command.y);
        return true;
      case "selectAll":
        this.selectAll();
        return true;
      case "delete":
        this.deleteSelection();
        return true;
      case "addText":
        this.addText(command.x, command.y, command.text);
        return true;
    }
  }

  moveTo(worldX: number, worldY: number): void {
    this.worldX = worldX;
    this.worldY = worldY;
    this.visible = true;
    this.notify();
  }

  moveToScreen(screenX: number, screenY: number): void {
    const world = screenToWorld({ x: screenX, y: screenY }, this.viewport);
    this.worldX = world.x;
    this.worldY = world.y;
    this.visible = true;
    this.notify();
  }

  pointerDown(button = 0): void {
    const screen = this.currentScreenPoint();
    this.inputController.pointerDown({
      pointerId: AGENT_POINTER_ID,
      clientX: screen.x,
      clientY: screen.y,
      button,
    });
  }

  pointerUp(): void {
    const screen = this.currentScreenPoint();
    this.inputController.pointerUp({
      pointerId: AGENT_POINTER_ID,
      clientX: screen.x,
      clientY: screen.y,
    });
  }

  click(button = 0): void {
    this.pointerDown(button);
    this.pointerUp();
  }

  setTool(tool: WhiteboardTool): void {
    this.storeApi.actions.setTool(tool);
  }

  keyDown(key: string): void {
    this.inputController.keyDown({
      key,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    });
  }

  typeText(text: string): void {
    for (const char of text) {
      this.inputController.keyDown({ key: char });
    }
  }

  wheel(deltaX: number, deltaY: number): void {
    const screen = this.currentScreenPoint();
    this.inputController.wheel({
      clientX: screen.x,
      clientY: screen.y,
      deltaX,
      deltaY,
    });
  }

  dispatchCommand(command: WhiteboardCommand): boolean {
    this.storeApi.dispatch(command);
    return true;
  }

  dispatchCommands(commands: readonly WhiteboardCommand[]): boolean {
    this.storeApi.dispatchBatch(commands);
    return true;
  }

  drawTool(tool: "rectangle" | "ellipse" | "diamond" | "line" | "arrow", from: WhiteboardPoint, to: WhiteboardPoint): void {
    this.setTool(tool);
    const screenFrom = worldToScreen(from, this.viewport);
    this.moveTo(from.x, from.y);
    this.inputController.pointerDown({
      pointerId: AGENT_POINTER_ID,
      clientX: screenFrom.x,
      clientY: screenFrom.y,
      button: 0,
    });

    const screenTo = worldToScreen(to, this.viewport);
    this.worldX = to.x;
    this.worldY = to.y;
    this.notify();

    this.inputController.pointerMove({
      pointerId: AGENT_POINTER_ID,
      clientX: screenTo.x,
      clientY: screenTo.y,
    });

    this.inputController.pointerUp({
      pointerId: AGENT_POINTER_ID,
      clientX: screenTo.x,
      clientY: screenTo.y,
    });
  }

  drawFreehand(points: readonly WhiteboardPoint[]): void {
    if (points.length === 0) return;
    this.setTool("freehand");

    const firstScreen = worldToScreen(points[0], this.viewport);
    this.moveTo(points[0].x, points[0].y);

    this.inputController.pointerDown({
      pointerId: AGENT_POINTER_ID,
      clientX: firstScreen.x,
      clientY: firstScreen.y,
      button: 0,
    });

    for (let i = 1; i < points.length; i++) {
      const screen = worldToScreen(points[i], this.viewport);
      this.worldX = points[i].x;
      this.worldY = points[i].y;
      this.notify();

      this.inputController.pointerMove({
        pointerId: AGENT_POINTER_ID,
        clientX: screen.x,
        clientY: screen.y,
      });
    }

    const lastScreen = worldToScreen(points[points.length - 1], this.viewport);
    this.inputController.pointerUp({
      pointerId: AGENT_POINTER_ID,
      clientX: lastScreen.x,
      clientY: lastScreen.y,
    });
  }

  selectAt(worldX: number, worldY: number): void {
    const hit = this.storeApi.actions.hitTest({ x: worldX, y: worldY });
    if (hit) {
      this.storeApi.actions.selectElements([hit.elementId]);
    }
    this.moveTo(worldX, worldY);
  }

  selectAll(): void {
    const doc = this.storeApi.getDocument();
    this.storeApi.actions.selectElements(doc.elements.map((e) => e.id));
  }

  deleteSelection(): void {
    this.storeApi.actions.removeSelection();
  }

  addText(worldX: number, worldY: number, text: string): void {
    this.setTool("text");
    const screen = worldToScreen({ x: worldX, y: worldY }, this.viewport);
    this.moveTo(worldX, worldY);

    this.inputController.pointerDown({
      pointerId: AGENT_POINTER_ID,
      clientX: screen.x,
      clientY: screen.y,
      button: 0,
    });

    this.inputController.pointerUp({
      pointerId: AGENT_POINTER_ID,
      clientX: screen.x,
      clientY: screen.y,
    });

    const doc = this.storeApi.getDocument();
    const selected = doc.selection;
    if (selected.length > 0) {
      const lastSelected = selected[selected.length - 1];
      this.storeApi.actions.commitText(lastSelected, text);
    }
  }

  private currentScreenPoint(): { readonly x: number; readonly y: number } {
    return worldToScreen({ x: this.worldX, y: this.worldY }, this.viewport);
  }
}
