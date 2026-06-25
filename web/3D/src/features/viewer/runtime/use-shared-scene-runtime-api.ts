"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { normalizeVariableValue, persistLocalVariables } from "@/features/editor/scene/scene-variables";
import { isDynamicVariable } from "@/features/editor/scene/dynamic-variables";
import type { RuntimeVisibilityOverrides } from "@/features/editor/interactions/object-visibility-actions";
import type { SceneDocument, SceneVariable, SceneVariableValue } from "@/features/editor/types";
import {
  runtimeApiCommandType,
  runtimeApiReadyType,
  runtimeApiResponseType,
  runtimeApiStateType,
  type EssenceSplineRuntimeApi,
  type EssenceSplineRuntimeRegistry,
  type RuntimeApiCommandMessage,
  type RuntimeApiResponseMessage,
  type RuntimeApiState,
} from "./runtime-api";

declare global {
  interface Window {
    EssenceSpline?: EssenceSplineRuntimeRegistry;
  }
}

interface UseSharedSceneRuntimeApiOptions {
  activeCameraId: string | null;
  document: SceneDocument;
  resetRuntime: () => void;
  runObjectInteraction: (objectId: string) => boolean;
  runtimeSceneStateId: string | null;
  runtimeVisibilityOverrides: RuntimeVisibilityOverrides;
  setRuntimeCameraId: Dispatch<SetStateAction<string | null>>;
  setRuntimeVisibilityOverrides: Dispatch<SetStateAction<RuntimeVisibilityOverrides>>;
  setVariables: Dispatch<SetStateAction<SceneVariable[]>>;
  variables: SceneVariable[];
}

function isRuntimeCommandMessage(value: unknown): value is RuntimeApiCommandMessage {
  return Boolean(value && typeof value === "object" && "type" in value && value.type === runtimeApiCommandType && "command" in value);
}

function readStringPayload(payload: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = payload?.[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function readBooleanPayload(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key];

  return typeof value === "boolean" ? value : null;
}

function isSceneVariableValue(value: unknown): value is SceneVariableValue {
  return typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

export function useSharedSceneRuntimeApi({
  activeCameraId,
  document,
  resetRuntime,
  runObjectInteraction,
  runtimeSceneStateId,
  runtimeVisibilityOverrides,
  setRuntimeCameraId,
  setRuntimeVisibilityOverrides,
  setVariables,
  variables,
}: UseSharedSceneRuntimeApiOptions) {
  const apiRef = useRef<EssenceSplineRuntimeApi | null>(null);
  const runtimeSceneId = document.activeSceneId ?? document.id;

  function getState(): RuntimeApiState {
    return {
      activeCameraId,
      objectIds: document.objects.map((object) => object.id),
      sceneId: runtimeSceneId,
      sceneName: document.name,
      runtimeSceneStateId,
      variables: variables.map((variable) => ({
        id: variable.id,
        name: variable.name,
        scope: variable.scope,
        source: variable.source ?? "manual",
        type: variable.type,
        value: variable.value,
      })),
      visibility: Object.fromEntries(document.objects.map((object) => [object.id, runtimeVisibilityOverrides[object.id] ?? object.visible])),
    };
  }

  apiRef.current = {
    getState,
    reset: () => {
      resetRuntime();

      return getState();
    },
    runInteraction: (objectId) => {
      if (!runObjectInteraction(objectId)) {
        throw new Error(`Object not found: ${objectId}`);
      }

      return getState();
    },
    setCamera: (cameraId) => {
      if (cameraId !== null && !document.objects.some((object) => object.id === cameraId && object.kind === "camera")) {
        throw new Error(`Camera not found: ${cameraId}`);
      }

      setRuntimeCameraId(cameraId);

      return getState();
    },
    setObjectVisible: (objectId, visible) => {
      if (!document.objects.some((object) => object.id === objectId)) {
        throw new Error(`Object not found: ${objectId}`);
      }

      setRuntimeVisibilityOverrides((currentOverrides) => ({
        ...currentOverrides,
        [objectId]: visible,
      }));

      return getState();
    },
    setVariable: (key, value) => {
      const normalizedKey = key.trim().toLowerCase();
      const targetVariable = variables.find((variable) => variable.id === key || variable.name.trim().toLowerCase() === normalizedKey);

      if (!targetVariable) {
        throw new Error(`Variable not found: ${key}`);
      }

      if (isDynamicVariable(targetVariable)) {
        throw new Error(`Variable is runtime-derived: ${key}`);
      }

      setVariables((currentVariables) => {
        const nextVariables = currentVariables.map((variable) => {
          if (variable.id !== targetVariable.id) {
            return variable;
          }

          return {
            ...variable,
            value: normalizeVariableValue(variable.type, value),
          };
        });

        persistLocalVariables(runtimeSceneId, nextVariables);

        return nextVariables;
      });

      return getState();
    },
  };

  useEffect(() => {
    const apiProxy: EssenceSplineRuntimeApi = {
      getState: () => apiRef.current?.getState() ?? getState(),
      reset: () => apiRef.current?.reset() ?? getState(),
      runInteraction: (objectId) => apiRef.current?.runInteraction(objectId) ?? getState(),
      setCamera: (cameraId) => apiRef.current?.setCamera(cameraId) ?? getState(),
      setObjectVisible: (objectId, visible) => apiRef.current?.setObjectVisible(objectId, visible) ?? getState(),
      setVariable: (key, value) => apiRef.current?.setVariable(key, value) ?? getState(),
    };

    const registry = window.EssenceSpline ?? {
      getScene(sceneId?: string) {
        return sceneId ? this.scenes[sceneId] : this.scenes[runtimeSceneId];
      },
      scenes: {},
    };

    registry.scenes[runtimeSceneId] = apiProxy;
    window.EssenceSpline = registry;
    window.parent.postMessage({ sceneId: runtimeSceneId, state: apiProxy.getState(), type: runtimeApiReadyType }, "*");

    function postResponse(source: MessageEventSource | null, response: RuntimeApiResponseMessage) {
      if (source && "postMessage" in source) {
        if ("closed" in source) {
          source.postMessage(response, "*");
        } else {
          source.postMessage(response);
        }
        return;
      }

      window.parent.postMessage(response, "*");
    }

    function handleMessage(event: MessageEvent) {
      if (!isRuntimeCommandMessage(event.data) || (event.data.sceneId && event.data.sceneId !== runtimeSceneId)) {
        return;
      }

      const message = event.data;
      const payload = message.payload;

      try {
        let state: RuntimeApiState;

        if (message.command === "getState") {
          state = apiProxy.getState();
        } else if (message.command === "reset") {
          state = apiProxy.reset();
        } else if (message.command === "runInteraction") {
          state = apiProxy.runInteraction(readStringPayload(payload, ["objectId", "id"]) ?? "");
        } else if (message.command === "setCamera") {
          state = apiProxy.setCamera(readStringPayload(payload, ["cameraId", "id"]));
        } else if (message.command === "setObjectVisible") {
          const objectId = readStringPayload(payload, ["objectId", "id"]);
          const visible = readBooleanPayload(payload, "visible");

          if (!objectId || visible === null) {
            throw new Error("setObjectVisible requires objectId and visible");
          }

          state = apiProxy.setObjectVisible(objectId, visible);
        } else {
          const key = readStringPayload(payload, ["key", "variableId", "name"]);
          const value = payload?.value;

          if (!key || !isSceneVariableValue(value)) {
            throw new Error("setVariable requires key and a string, number, or boolean value");
          }

          state = apiProxy.setVariable(key, value);
        }

        window.parent.postMessage({ sceneId: runtimeSceneId, state, type: runtimeApiStateType }, "*");
        postResponse(event.source, {
          command: message.command,
          commandId: message.commandId,
          ok: true,
          sceneId: runtimeSceneId,
          state,
          type: runtimeApiResponseType,
        });
      } catch (error) {
        postResponse(event.source, {
          command: message.command,
          commandId: message.commandId,
          error: error instanceof Error ? error.message : "Runtime command failed",
          ok: false,
          sceneId: runtimeSceneId,
          type: runtimeApiResponseType,
        });
      }
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      delete registry.scenes[runtimeSceneId];
    };
  }, [runtimeSceneId]);
}
