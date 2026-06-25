import type { SceneVariableSource, SceneVariableValue } from "@/features/editor/types";

export const runtimeApiReadyType = "essence-spline:runtime-ready";
export const runtimeApiStateType = "essence-spline:runtime-state";
export const runtimeApiCommandType = "essence-spline:runtime-command";
export const runtimeApiResponseType = "essence-spline:runtime-response";

export type RuntimeApiCommandName = "getState" | "reset" | "runInteraction" | "setCamera" | "setObjectVisible" | "setVariable";

export interface RuntimeApiVariableSnapshot {
  id: string;
  name: string;
  scope: "scene" | "local";
  source: SceneVariableSource;
  type: "boolean" | "color" | "number" | "text";
  value: SceneVariableValue;
}

export interface RuntimeApiState {
  activeCameraId: string | null;
  objectIds: string[];
  sceneId: string;
  sceneName: string;
  runtimeSceneStateId: string | null;
  variables: RuntimeApiVariableSnapshot[];
  visibility: Record<string, boolean>;
}

export interface RuntimeApiCommandMessage {
  command: RuntimeApiCommandName;
  commandId?: string;
  payload?: Record<string, unknown>;
  sceneId?: string;
  type: typeof runtimeApiCommandType;
}

export interface RuntimeApiResponseMessage {
  command: RuntimeApiCommandName;
  commandId?: string;
  error?: string;
  ok: boolean;
  sceneId: string;
  state?: RuntimeApiState;
  type: typeof runtimeApiResponseType;
}

export interface EssenceSplineRuntimeApi {
  getState: () => RuntimeApiState;
  reset: () => RuntimeApiState;
  runInteraction: (objectId: string) => RuntimeApiState;
  setCamera: (cameraId: string | null) => RuntimeApiState;
  setObjectVisible: (objectId: string, visible: boolean) => RuntimeApiState;
  setVariable: (key: string, value: SceneVariableValue) => RuntimeApiState;
}

export interface EssenceSplineRuntimeRegistry {
  getScene: (sceneId?: string) => EssenceSplineRuntimeApi | undefined;
  scenes: Record<string, EssenceSplineRuntimeApi>;
}
