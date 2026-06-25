"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyAnimationAction, getRuntimeNowSeconds, type RuntimeAnimationOverrides } from "../interactions/animation-actions";
import { cloneAnimationValue, readAnimationPropertyValue } from "../animation/animation-registry";
import { applyObjectInstanceAction, type RuntimeObjectInstance } from "../interactions/object-instance-actions";
import { applyObjectVisibilityAction, type RuntimeVisibilityOverrides } from "../interactions/object-visibility-actions";
import { runNetworkActions } from "../interactions/network-actions";
import { applyParticleAction, type RuntimeParticleOverrides } from "../interactions/particle-actions";
import { applyPropertyToggleAction, type RuntimePropertyOverrides } from "../interactions/property-toggle-actions";
import { applySceneStateTransitions, applySceneStateVisibility, resolveSceneTransition } from "../interactions/scene-transition-actions";
import { applyTransitionAction, type RuntimeTransitionOverrides } from "../interactions/transition-actions";
import { mergeAudioLibrary } from "../scene/audio-library";
import { createBuiltInTemplateObjects } from "../scene/built-in-templates";
import { createComponentFromObject, instantiateComponent as createComponentInstance, mergeComponentLibrary } from "../scene/component-library";
import { createDefaultDocument, createSceneObject, resolveSceneSettings } from "../scene/default-document";
import { mergeMaterialLibrary } from "../scene/material-library";
import {
  getDefaultVariableValueForSource,
  getVariableTypeForSource,
  isDynamicVariable,
  normalizeVariableForSource,
  resolveDynamicVariableValues,
  type DynamicVariableRuntime,
} from "../scene/dynamic-variables";
import { createInputControl } from "../scene/input-controls";
import { applySceneSnapshot, createSceneSnapshotFromTemplate, ensureDocumentScenes, getUniqueSceneName, syncActiveScene } from "../scene/multi-scene";
import { defaultPivot, resolvePivot } from "../scene/object-pivot";
import type { RuntimePhysicsTransforms } from "../runtime/physics-runtime-state";
import {
  appendViewportInteractionEvent,
  createViewportInteractionTrace,
  type AppendViewportInteractionEventInput,
  type ViewportInteractionTrace,
} from "../runtime/viewport-interaction-trace";
import { createAnimationTracksFromSceneState } from "../scene/scene-state-animation";
import { applySceneStateToDocument, createSceneStateFromDocument, recaptureSceneState } from "../scene/scene-states";
import { getDescendantIds } from "../scene/scene-tree-utils";
import {
  alignTwoDLayerToParent,
  applyTwoDLayoutToChildren,
  canContainTwoDLayer,
  createTwoDFrame,
  createTwoDPage,
  createTwoDUiPrimitive,
  type TwoDUiPrimitiveKind,
} from "../scene/two-d";
import {
  applyVariableAction,
  clearLocalVariableValues,
  createSceneVariable,
  deleteLocalVariableValue,
  getDefaultVariableValue,
  normalizeVariableValue,
  persistLocalVariables,
  resetLocalVariablesToBaseline,
  resolveLocalVariableValues,
  setSceneVariableValue,
} from "../scene/scene-variables";
import {
  sceneDocumentSchema,
  type AudioSettings,
  type AnimationKeyframeValue,
  type AnimationProperty,
  type AnimationTrack,
  type CameraSettings,
  type FigmaSettings,
  type GeometrySettings,
  type ImageSettings,
  type SceneInputControl,
  type LightSettings,
  type Material,
  type ModelSettings,
  type ObjectInteraction,
  type PrimitiveKind,
  type SceneComponent,
  type SceneDocument,
  type SceneFileScene,
  type SceneAudioAsset,
  type SceneMaterialAsset,
  type SceneVariable,
  type SceneVariableValue,
  type SceneVariableType,
  type SceneObject,
  type SceneSettings,
  type SplineSettings,
  type SvgSettings,
  type TextSettings,
  type Transform,
  type TransformConstraints,
  type Vec3,
  type VideoSettings,
} from "../types";

type EditorMode = "select" | "move" | "rotate" | "scale";
type EditorSurfaceMode = "2d" | "3d";
type HistoryState = Pick<EditorState, "document" | "selectedObjectId">;

interface EditorState {
  document: SceneDocument;
  activeProjectId: string | null;
  lastSavedAt: string | null;
  lastSavedDocument: SceneDocument | null;
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  mode: EditorMode;
  surfaceMode: EditorSurfaceMode;
  commandPaletteOpen: boolean;
  cameraPreviewEnabled: boolean;
  playModeEnabled: boolean;
  runtimeCameraId: string | null;
  runtimeAnimationOverrides: RuntimeAnimationOverrides;
  runtimeAnimationStartedAt: number;
  runtimeObjectInstances: RuntimeObjectInstance[];
  runtimeVisibilityOverrides: RuntimeVisibilityOverrides;
  runtimePropertyOverrides: RuntimePropertyOverrides;
  runtimeParticleOverrides: RuntimeParticleOverrides;
  runtimePhysicsTransforms: RuntimePhysicsTransforms;
  runtimePhysicsResetKey: number;
  runtimeTransitionOverrides: RuntimeTransitionOverrides;
  runtimeSceneStateId: string | null;
  runtimeSceneSettings: SceneSettings | null;
  viewportInteractionTrace: ViewportInteractionTrace;
  playBaselineVariables: SceneVariable[] | null;
  past: HistoryState[];
  future: HistoryState[];
  selectObject: (id: string | null) => void;
  hoverObject: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setSurfaceMode: (mode: EditorSurfaceMode) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCameraPreviewEnabled: (enabled: boolean) => void;
  setPlayModeEnabled: (enabled: boolean) => void;
  setActiveCamera: (id: string | null) => void;
  setDocumentName: (name: string) => void;
  updateSceneSettings: (settings: Partial<SceneSettings>) => void;
  addSceneState: () => void;
  updateSceneStateName: (id: string, name: string) => void;
  captureSceneState: (id: string) => void;
  applySceneState: (id: string) => void;
  createAnimationFromSceneState: (id: string, duration: number) => void;
  deleteSceneState: (id: string) => void;
  addVariable: (type: SceneVariableType) => void;
  updateVariable: (id: string, variable: Partial<Omit<SceneVariable, "id">>) => void;
  deleteVariable: (id: string) => void;
  updateDynamicVariables: (runtime: DynamicVariableRuntime) => void;
  addInputControl: (variableId: string) => void;
  updateInputControl: (id: string, inputControl: Partial<Omit<SceneInputControl, "id">>) => void;
  deleteInputControl: (id: string) => void;
  setRuntimeVariableValue: (id: string, value: SceneVariableValue) => void;
  setRuntimePhysicsTransforms: (transforms: RuntimePhysicsTransforms) => void;
  recordViewportInteractionEvent: (event: AppendViewportInteractionEventInput) => void;
  clearViewportInteractionTrace: () => void;
  runInteraction: (interaction?: ObjectInteraction | null) => void;
  addObject: (kind: PrimitiveKind) => void;
  addTwoDPage: () => void;
  addTwoDFrame: () => void;
  addTwoDUiPrimitive: (kind: TwoDUiPrimitiveKind) => void;
  alignTwoDLayerToParent: (id: string) => void;
  applyTwoDLayout: (id: string) => void;
  addModelObject: (model: ModelSettings) => void;
  addImageObject: (image: ImageSettings) => void;
  addVideoObject: (video: VideoSettings) => void;
  addAudioObject: (audio: AudioSettings) => void;
  addSvgObject: (svg: SvgSettings) => void;
  addFigmaObject: (figma: FigmaSettings) => void;
  addSplineObject: (spline: SplineSettings) => void;
  instantiateBuiltInTemplate: (templateId: string) => void;
  createComponentFromSelection: () => void;
  instantiateComponent: (componentId: string) => void;
  deleteComponent: (componentId: string) => void;
  importComponentLibrary: (components: SceneComponent[]) => void;
  createAudioAssetFromSelection: (name?: string) => void;
  instantiateAudioAsset: (assetId: string) => void;
  deleteAudioAsset: (assetId: string) => void;
  importAudioAssets: (assets: SceneAudioAsset[]) => void;
  createMaterialAssetFromSelection: (name?: string) => void;
  deleteMaterialAsset: (assetId: string) => void;
  importMaterialAssets: (assets: SceneMaterialAsset[]) => void;
  addScene: () => void;
  deleteScene: (id: string) => void;
  duplicateScene: (id: string) => void;
  moveScene: (id: string, direction: -1 | 1) => void;
  renameScene: (id: string, name: string) => void;
  switchScene: (id: string) => void;
  setAnimationKeyframe: (id: string, property: AnimationProperty, time: number) => void;
  setObjectAnimationDuration: (id: string, duration: number) => void;
  updateAnimationTrack: (id: string, property: AnimationProperty, track: Partial<Pick<AnimationTrack, "easing" | "loop">>) => void;
  updateAnimationKeyframeTime: (id: string, property: AnimationProperty, keyframeId: string, time: number) => void;
  removeAnimationKeyframe: (id: string, property: AnimationProperty, keyframeId: string) => void;
  removeAnimationTrack: (id: string, property: AnimationProperty) => void;
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
  updateTransform: (id: string, transform: Partial<Transform>) => void;
  beginViewportTransform: (id: string) => void;
  applyViewportTransform: (id: string, transform: Transform) => void;
  updateConstraints: (id: string, constraints: Partial<TransformConstraints>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  updateGeometry: (id: string, geometry: Partial<GeometrySettings>) => void;
  updateText: (id: string, text: Partial<TextSettings>) => void;
  updateLight: (id: string, light: Partial<LightSettings>) => void;
  updateCamera: (id: string, camera: Partial<CameraSettings>) => void;
  updateInteraction: (id: string, interaction: Partial<ObjectInteraction>) => void;
  updateVector: (id: string, group: keyof Transform, index: number, value: number) => void;
  updatePivot: (id: string, index: number, value: number) => void;
  groupSelectedObject: () => void;
  ungroupObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  deleteObject: (id: string) => void;
  resetDocument: () => void;
  loadDocument: (document: SceneDocument) => void;
  loadProject: (projectId: string, document: SceneDocument, savedAt?: string | null) => void;
  replaceDocument: (document: SceneDocument, selectedObjectId?: string | null) => void;
  markProjectSaved: (projectId: string, savedAt?: string | null, document?: SceneDocument | null) => void;
  detachProject: () => void;
  undo: () => void;
  redo: () => void;
}

function withUpdatedAt(document: SceneDocument): SceneDocument {
  return syncActiveScene({
    ...document,
    updatedAt: new Date().toISOString(),
  });
}

function cloneForHistory(state: EditorState): HistoryState {
  return {
    document: structuredClone(state.document),
    selectedObjectId: state.selectedObjectId,
  };
}

function commit(state: EditorState, nextDocument: SceneDocument, selectedObjectId = state.selectedObjectId) {
  return {
    document: withUpdatedAt(nextDocument),
    selectedObjectId,
    past: [...state.past.slice(-49), cloneForHistory(state)],
    future: [],
  };
}

function hydrateLocalVariables(document: SceneDocument): SceneDocument {
  if (!document.variables?.length) {
    return document;
  }

  const variables = resolveLocalVariableValues(document.id, document.variables);

  return variables === document.variables
    ? document
    : {
        ...document,
        variables,
      };
}

function getPreparedDocument(document: SceneDocument): SceneDocument {
  return hydrateLocalVariables(ensureDocumentScenes(document));
}

function getActiveTraceSceneId(document: SceneDocument) {
  return document.activeSceneId ?? document.id;
}

function createTraceForDocument(document: SceneDocument) {
  return createViewportInteractionTrace({
    sceneId: getActiveTraceSceneId(document),
  });
}

function resolveViewportInteractionTrace(state: Pick<EditorState, "document" | "viewportInteractionTrace">) {
  const sceneId = getActiveTraceSceneId(state.document);

  return state.viewportInteractionTrace.sceneId === sceneId ? state.viewportInteractionTrace : createViewportInteractionTrace({ sceneId });
}

function getUniqueAudioAssetName(assets: SceneAudioAsset[], baseName: string) {
  const existingNames = new Set(assets.map((asset) => asset.name));
  const trimmedBase = baseName.trim() || "Audio";
  let name = trimmedBase;
  let suffix = 2;

  while (existingNames.has(name)) {
    name = `${trimmedBase} ${suffix}`;
    suffix += 1;
  }

  return name;
}

function getUniqueMaterialAssetName(assets: SceneMaterialAsset[], baseName: string) {
  const existingNames = new Set(assets.map((asset) => asset.name));
  const trimmedBase = baseName.trim() || "Material";
  let name = trimmedBase;
  let suffix = 2;

  while (existingNames.has(name)) {
    name = `${trimmedBase} ${suffix}`;
    suffix += 1;
  }

  return name;
}

function getUniqueObjectName(objects: SceneObject[], baseName: string) {
  const existingNames = new Set(objects.map((object) => object.name));
  const trimmedBase = baseName.trim() || "Object";
  let name = trimmedBase;
  let suffix = 2;

  while (existingNames.has(name)) {
    name = `${trimmedBase} ${suffix}`;
    suffix += 1;
  }

  return name;
}

function getTwoDContainerParent(objects: SceneObject[], selectedObjectId: string | null) {
  const selectedObject = objects.find((object) => object.id === selectedObjectId);
  const fallbackPage = objects.find((object) => object.twoD?.kind === "page");

  return canContainTwoDLayer(selectedObject) ? selectedObject : fallbackPage;
}

function getTwoDUiPrimitiveBaseName(kind: TwoDUiPrimitiveKind) {
  if (kind === "button") {
    return "2D Button";
  }

  if (kind === "input") {
    return "2D Input";
  }

  return "2D Card";
}

function createAudioSceneObject(audio: AudioSettings, name?: string) {
  const baseName = name ?? audio.fileName.replace(/\.[^.]+$/i, "").trim();
  const object = createSceneObject("audio", baseName || "Imported Audio");
  object.audio = structuredClone(audio);
  object.transform.position = [0, 1.2, 0];
  object.material = {
    ...object.material,
    color: "#d4d4d8",
    roughness: 0.5,
    metalness: 0.1,
  };

  return object;
}

function switchDocumentToScene(document: SceneDocument, scene: SceneFileScene): SceneDocument {
  return syncActiveScene(
    applySceneSnapshot(
      {
        ...document,
        activeSceneId: scene.id,
      },
      scene,
    ),
  );
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);

  if (item === undefined) {
    return items;
  }

  nextItems.splice(toIndex, 0, item);

  return nextItems;
}

function moveVec3(vector: Vec3, index: number, value: number): Vec3 {
  return vector.map((entry, entryIndex) => (entryIndex === index ? value : entry)) as Vec3;
}

function offsetVec3(vector: Vec3, offset: Vec3): Vec3 {
  return [vector[0] + offset[0], vector[1] + offset[1], vector[2] + offset[2]];
}

function sameTime(left: number, right: number) {
  return Math.abs(left - right) < 0.001;
}

function clampAnimationTime(time: number) {
  return Math.min(120, Math.max(0, Number.isFinite(time) ? time : 0));
}

function getTrackDuration(track: AnimationTrack) {
  return Math.max(0, ...track.keyframes.map((keyframe) => keyframe.time));
}

function createAnimationTrack(objectId: string, property: AnimationProperty, value: AnimationKeyframeValue, time: number): AnimationTrack {
  return {
    id: nanoid(),
    objectId,
    property,
    easing: "linear",
    loop: true,
    keyframes: [
      {
        id: nanoid(),
        time,
        value: cloneAnimationValue(value),
      },
    ],
  };
}

function upsertAnimationKeyframe(track: AnimationTrack, value: AnimationKeyframeValue, time: number): AnimationTrack {
  const existing = track.keyframes.find((keyframe) => sameTime(keyframe.time, time));
  const keyframe = {
    id: existing?.id ?? nanoid(),
    time,
    value: cloneAnimationValue(value),
  };
  const keyframes = existing ? track.keyframes.map((entry) => (sameTime(entry.time, time) ? keyframe : entry)) : [...track.keyframes, keyframe];

  return {
    ...track,
    keyframes: keyframes.sort((left, right) => left.time - right.time),
  };
}

const defaultEditorDocument = ensureDocumentScenes(createDefaultDocument("Essence Spline Scene"));

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      document: defaultEditorDocument,
      activeProjectId: null,
      lastSavedAt: null,
      lastSavedDocument: null,
      selectedObjectId: null,
      hoveredObjectId: null,
      mode: "select",
      surfaceMode: "3d",
      commandPaletteOpen: false,
      cameraPreviewEnabled: false,
      playModeEnabled: false,
      runtimeCameraId: null,
      runtimeAnimationOverrides: {},
      runtimeAnimationStartedAt: 0,
      runtimeObjectInstances: [],
      runtimeVisibilityOverrides: {},
      runtimePropertyOverrides: {},
      runtimeParticleOverrides: {},
      runtimePhysicsTransforms: {},
      runtimePhysicsResetKey: 0,
      runtimeTransitionOverrides: {},
      runtimeSceneStateId: null,
      runtimeSceneSettings: null,
      viewportInteractionTrace: createTraceForDocument(defaultEditorDocument),
      playBaselineVariables: null,
      past: [],
      future: [],
      selectObject: (id) =>
        set((state) => {
          const trace = resolveViewportInteractionTrace(state);

          return {
            selectedObjectId: id,
            viewportInteractionTrace:
              state.selectedObjectId === id
                ? trace
                : appendViewportInteractionEvent(trace, {
                    at: new Date().toISOString(),
                    kind: "selection",
                    selection: {
                      nextObjectId: id,
                      previousObjectId: state.selectedObjectId,
                    },
                    type: "selection-change",
                  }),
          };
        }),
      hoverObject: (id) =>
        set((state) =>
          state.hoveredObjectId === id ? state : { hoveredObjectId: id },
        ),
      setMode: (mode) => set({ mode }),
      setSurfaceMode: (surfaceMode) => set({ surfaceMode }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setCameraPreviewEnabled: (enabled) => set({ cameraPreviewEnabled: enabled }),
      setPlayModeEnabled: (enabled) => {
        const now = getRuntimeNowSeconds();

        return set({
          playModeEnabled: enabled,
          cameraPreviewEnabled: enabled ? false : get().cameraPreviewEnabled,
          runtimeCameraId: null,
          runtimeAnimationOverrides: {},
          runtimeAnimationStartedAt: enabled ? now : 0,
          runtimeObjectInstances: [],
          runtimeVisibilityOverrides: {},
          runtimePropertyOverrides: {},
          runtimeParticleOverrides: {},
          runtimePhysicsTransforms: {},
          runtimePhysicsResetKey: get().runtimePhysicsResetKey + 1,
          runtimeTransitionOverrides: {},
          runtimeSceneStateId: null,
          runtimeSceneSettings: null,
          playBaselineVariables: enabled ? structuredClone(get().document.variables ?? []) : null,
        });
      },
      setActiveCamera: (id) =>
        set((state) =>
          commit(state, {
            ...state.document,
            activeCameraId: id,
          }),
        ),
      setDocumentName: (name) =>
        set((state) =>
          commit(state, {
            ...state.document,
            name,
          }),
        ),
      updateSceneSettings: (settings) =>
        set((state) =>
          commit(state, {
            ...state.document,
            sceneSettings: resolveSceneSettings({ ...state.document.sceneSettings, ...settings }),
          }),
        ),
      addSceneState: () =>
        set((state) =>
          commit(state, {
            ...state.document,
            sceneStates: [...(state.document.sceneStates ?? []), createSceneStateFromDocument(state.document)],
          }),
        ),
      updateSceneStateName: (id, name) =>
        set((state) =>
          commit(state, {
            ...state.document,
            sceneStates: (state.document.sceneStates ?? []).map((sceneState) =>
              sceneState.id === id
                ? {
                    ...sceneState,
                    name,
                    updatedAt: new Date().toISOString(),
                  }
                : sceneState,
            ),
          }),
        ),
      captureSceneState: (id) =>
        set((state) =>
          commit(state, {
            ...state.document,
            sceneStates: (state.document.sceneStates ?? []).map((sceneState) => (sceneState.id === id ? recaptureSceneState(sceneState, state.document) : sceneState)),
          }),
        ),
      applySceneState: (id) =>
        set((state) => {
          const sceneState = (state.document.sceneStates ?? []).find((entry) => entry.id === id);

          if (!sceneState) {
            return state;
          }

          return {
            ...commit(state, applySceneStateToDocument(state.document, sceneState)),
            runtimeSceneStateId: null,
            runtimeSceneSettings: null,
            runtimeTransitionOverrides: {},
            runtimeVisibilityOverrides: {},
            runtimePropertyOverrides: {},
            runtimePhysicsTransforms: {},
            runtimePhysicsResetKey: state.runtimePhysicsResetKey + 1,
          };
        }),
      createAnimationFromSceneState: (id, duration) =>
        set((state) => {
          const sceneState = (state.document.sceneStates ?? []).find((entry) => entry.id === id);

          if (!sceneState) {
            return state;
          }

          const currentTracks = state.document.animationTracks ?? [];
          const animationTracks = createAnimationTracksFromSceneState(state.document, sceneState, Math.min(120, Math.max(0.05, duration)));

          if (animationTracks.length === currentTracks.length && animationTracks.every((track, index) => track === currentTracks[index])) {
            return state;
          }

          return commit(state, {
            ...state.document,
            animationTracks,
          });
        }),
      deleteSceneState: (id) =>
        set((state) => {
          const sceneStates = (state.document.sceneStates ?? []).filter((sceneState) => sceneState.id !== id);

          if (sceneStates.length === (state.document.sceneStates ?? []).length) {
            return state;
          }

          return commit(state, {
            ...state.document,
            sceneStates,
            objects: state.document.objects.map((object) =>
              object.interaction?.sceneTransitionAction?.targetStateId === id || object.interaction?.stateChangeTrigger?.targetStateId === id
                ? {
                    ...object,
                    interaction: {
                      ...object.interaction,
                      sceneTransitionAction: undefined,
                      stateChangeTrigger: object.interaction.stateChangeTrigger?.targetStateId === id ? undefined : object.interaction.stateChangeTrigger,
                    },
                  }
                : object,
            ),
          });
        }),
      addVariable: (type) =>
        set((state) => {
          const variables = state.document.variables ?? [];

          return commit(state, {
            ...state.document,
            variables: [...variables, createSceneVariable(type, variables.length + 1)],
          });
        }),
      updateVariable: (id, variable) =>
        set((state) => {
          const variables = (state.document.variables ?? []).map((entry) => {
            if (entry.id !== id) {
              return entry;
            }

            const source = variable.source ?? entry.source ?? "manual";
            const type = getVariableTypeForSource(source, variable.type ?? entry.type);
            const sourceChanged = variable.source !== undefined && variable.source !== (entry.source ?? "manual");
            const typeChanged = variable.type !== undefined && variable.type !== entry.type;
            const value =
              variable.value !== undefined
                ? normalizeVariableValue(type, variable.value)
                : sourceChanged
                  ? getDefaultVariableValueForSource(source, type)
                : typeChanged
                  ? getDefaultVariableValue(type)
                  : normalizeVariableValue(type, entry.value);

            return normalizeVariableForSource({
              ...entry,
              ...variable,
              name: variable.name ?? entry.name,
              scope: source === "manual" ? variable.scope ?? entry.scope : "scene",
              source,
              type,
              value,
            });
          });

          persistLocalVariables(state.document.id, variables);

          return commit(state, {
            ...state.document,
            variables,
          });
        }),
      deleteVariable: (id) =>
        set((state) => {
          deleteLocalVariableValue(state.document.id, id);

          return commit(state, {
            ...state.document,
            inputControls: (state.document.inputControls ?? []).filter((inputControl) => inputControl.variableId !== id),
            variables: (state.document.variables ?? []).filter((variable) => variable.id !== id),
          });
        }),
      updateDynamicVariables: (runtime) =>
        set((state) => {
          const sourceVariables = state.document.variables ?? [];
          const variables = resolveDynamicVariableValues(sourceVariables, runtime);

          if (variables === sourceVariables) {
            return state;
          }

          return {
            document: {
              ...state.document,
              variables,
            },
          };
        }),
      addInputControl: (variableId) =>
        set((state) => {
          const variable = (state.document.variables ?? []).find((entry) => entry.id === variableId);

          if (!variable || isDynamicVariable(variable)) {
            return state;
          }

          return commit(state, {
            ...state.document,
            inputControls: [...(state.document.inputControls ?? []), createInputControl(variable, (state.document.inputControls ?? []).length + 1)],
          });
        }),
      updateInputControl: (id, inputControl) =>
        set((state) =>
          commit(state, {
            ...state.document,
            inputControls: (state.document.inputControls ?? []).map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    ...inputControl,
                  }
                : entry,
            ),
          }),
        ),
      deleteInputControl: (id) =>
        set((state) => {
          const inputControls = (state.document.inputControls ?? []).filter((inputControl) => inputControl.id !== id);

          if (inputControls.length === (state.document.inputControls ?? []).length) {
            return state;
          }

          return commit(state, {
            ...state.document,
            inputControls,
          });
        }),
      setRuntimeVariableValue: (id, value) =>
        set((state) => {
          const sourceVariables = state.document.variables ?? [];
          const variables = setSceneVariableValue(sourceVariables, id, value);

          if (variables === sourceVariables) {
            return state;
          }

          persistLocalVariables(state.document.id, variables);

          return {
            document: withUpdatedAt({
              ...state.document,
              variables,
            }),
          };
        }),
      setRuntimePhysicsTransforms: (transforms) => set({ runtimePhysicsTransforms: transforms }),
      recordViewportInteractionEvent: (event) =>
        set((state) => ({
          viewportInteractionTrace: appendViewportInteractionEvent(resolveViewportInteractionTrace(state), event),
        })),
      clearViewportInteractionTrace: () =>
        set((state) => ({
          viewportInteractionTrace: createViewportInteractionTrace({
            sceneId: getActiveTraceSceneId(state.document),
          }),
        })),
      runInteraction: (interaction) => {
        const snapshot = get();

        runNetworkActions(interaction, snapshot.document.variables ?? [], {
          sceneId: snapshot.document.id,
          sceneName: snapshot.document.name,
        });

        set((state) => {
          const now = getRuntimeNowSeconds();
          const resetEnabled = interaction?.resetAction?.enabled === true;
          const clearLocalVariables = interaction?.localStorageAction?.clearLocalVariables === true;
          const baselineVariables = state.playBaselineVariables ?? state.document.variables ?? [];
          const sourceVariables = resetEnabled ? structuredClone(baselineVariables) : (state.document.variables ?? []);
          const variables = clearLocalVariables ? resetLocalVariablesToBaseline(sourceVariables, baselineVariables) : sourceVariables;
          const nextVariables = applyVariableAction(variables, interaction?.variableAction);
          const visibilityBase = resetEnabled ? {} : state.runtimeVisibilityOverrides;
          let runtimeVisibilityOverrides = applyObjectVisibilityAction(interaction?.objectVisibilityAction, state.document.objects, visibilityBase);
          const propertyBase = resetEnabled ? {} : state.runtimePropertyOverrides;
          const runtimePropertyOverrides = applyPropertyToggleAction(interaction?.propertyToggleAction, state.document.objects, propertyBase);
          const particleBase = resetEnabled ? {} : state.runtimeParticleOverrides;
          const runtimeParticleOverrides = applyParticleAction(interaction?.particleAction, state.document.objects, particleBase);
          const instanceBase = resetEnabled ? [] : state.runtimeObjectInstances;
          const runtimeObjectInstances = applyObjectInstanceAction(interaction?.objectInstanceAction, state.document.objects, instanceBase);
          const animationStartedAt = resetEnabled ? now : state.runtimeAnimationStartedAt;
          const animationBase = resetEnabled ? {} : state.runtimeAnimationOverrides;
          const runtimeAnimationOverrides = applyAnimationAction(interaction?.animationAction, state.document.objects, state.document.animationTracks ?? [], animationBase, now, animationStartedAt);
          const transitionBase = resetEnabled ? {} : state.runtimeTransitionOverrides;
          let runtimeTransitionOverrides = applyTransitionAction(interaction?.transitionAction, state.document.objects, transitionBase, now);
          const sceneTransition = resolveSceneTransition(interaction?.sceneTransitionAction, state.document.sceneStates ?? [], state.document.objects);
          const runtimeSceneSettings = sceneTransition ? sceneTransition.runtimeSceneSettings : resetEnabled ? null : state.runtimeSceneSettings;
          const runtimeSceneStateId = sceneTransition ? sceneTransition.sceneState.id : resetEnabled ? null : state.runtimeSceneStateId;

          if (sceneTransition) {
            runtimeVisibilityOverrides = applySceneStateVisibility(sceneTransition.sceneState, state.document.objects, runtimeVisibilityOverrides);
            runtimeTransitionOverrides = applySceneStateTransitions(
              sceneTransition.sceneState,
              state.document.objects,
              runtimeTransitionOverrides,
              now,
              sceneTransition.duration,
            );
          }

          const targetCameraId = interaction?.cameraAction?.targetCameraId;
          const resetCameraId = resetEnabled ? null : state.runtimeCameraId;
          const runtimeCameraId =
            targetCameraId && state.document.objects.some((object) => object.id === targetCameraId && object.kind === "camera")
              ? targetCameraId
              : sceneTransition
                ? sceneTransition.runtimeCameraId
                : resetCameraId;
          const variablesChanged = resetEnabled || clearLocalVariables || nextVariables !== (state.document.variables ?? []);
          const visibilityChanged = runtimeVisibilityOverrides !== state.runtimeVisibilityOverrides;
          const propertiesChanged = runtimePropertyOverrides !== state.runtimePropertyOverrides;
          const particlesChanged = runtimeParticleOverrides !== state.runtimeParticleOverrides;
          const instancesChanged = runtimeObjectInstances !== state.runtimeObjectInstances;
          const animationsChanged = resetEnabled || runtimeAnimationOverrides !== state.runtimeAnimationOverrides || animationStartedAt !== state.runtimeAnimationStartedAt;
          const transitionsChanged = resetEnabled || runtimeTransitionOverrides !== state.runtimeTransitionOverrides;
          const sceneStateChanged = runtimeSceneStateId !== state.runtimeSceneStateId;
          const sceneSettingsChanged = resetEnabled || runtimeSceneSettings !== state.runtimeSceneSettings;
          const runtimePhysicsResetKey = resetEnabled ? state.runtimePhysicsResetKey + 1 : state.runtimePhysicsResetKey;

          if (
            !variablesChanged &&
            runtimeCameraId === state.runtimeCameraId &&
            !visibilityChanged &&
            !propertiesChanged &&
            !particlesChanged &&
            !instancesChanged &&
            !animationsChanged &&
            !transitionsChanged &&
            !sceneStateChanged &&
            !sceneSettingsChanged
          ) {
            return state;
          }

          if (!variablesChanged) {
            return {
              runtimeCameraId,
              runtimeAnimationOverrides,
              runtimeAnimationStartedAt: animationStartedAt,
              runtimeObjectInstances,
              runtimeVisibilityOverrides,
              runtimePropertyOverrides,
              runtimeParticleOverrides,
              runtimeTransitionOverrides,
              runtimeSceneStateId,
              runtimeSceneSettings,
              runtimePhysicsTransforms: resetEnabled ? {} : state.runtimePhysicsTransforms,
              runtimePhysicsResetKey,
            };
          }

          if (clearLocalVariables) {
            clearLocalVariableValues(state.document.id, baselineVariables);
          } else {
            persistLocalVariables(state.document.id, nextVariables);
          }

          return {
            runtimeCameraId,
            runtimeAnimationOverrides,
            runtimeAnimationStartedAt: animationStartedAt,
            runtimeObjectInstances,
            runtimeVisibilityOverrides,
            runtimePropertyOverrides,
            runtimeParticleOverrides,
            runtimeTransitionOverrides,
            runtimeSceneStateId,
            runtimeSceneSettings,
            runtimePhysicsTransforms: resetEnabled ? {} : state.runtimePhysicsTransforms,
            runtimePhysicsResetKey,
            document: withUpdatedAt({
              ...state.document,
              variables: nextVariables,
            }),
          };
        });
      },
      addObject: (kind) =>
        set((state) => {
          const object = createSceneObject(kind);

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      addTwoDPage: () =>
        set((state) => {
          const object = createTwoDPage(getUniqueObjectName(state.document.objects, "2D Page"));

          return {
            ...commit(
              state,
              {
                ...state.document,
                objects: [...state.document.objects, object],
              },
              object.id,
            ),
            mode: "select",
            surfaceMode: "2d",
          };
        }),
      addTwoDFrame: () =>
        set((state) => {
          const parent = getTwoDContainerParent(state.document.objects, state.selectedObjectId);
          const object = createTwoDFrame(parent?.id ?? null, getUniqueObjectName(state.document.objects, "2D Frame"));

          return {
            ...commit(
              state,
              {
                ...state.document,
                objects: [...state.document.objects, object],
              },
              object.id,
            ),
            mode: "select",
            surfaceMode: "2d",
          };
        }),
      addTwoDUiPrimitive: (kind) =>
        set((state) => {
          const parent = getTwoDContainerParent(state.document.objects, state.selectedObjectId);
          const primitive = createTwoDUiPrimitive(kind, parent?.id ?? null, getUniqueObjectName(state.document.objects, getTwoDUiPrimitiveBaseName(kind)));

          return {
            ...commit(
              state,
              {
                ...state.document,
                objects: [...state.document.objects, ...primitive.objects],
              },
              primitive.rootObjectId,
            ),
            mode: "select",
            surfaceMode: "2d",
          };
        }),
      alignTwoDLayerToParent: (id) =>
        set((state) => {
          const objects = alignTwoDLayerToParent(state.document.objects, id);

          if (objects === state.document.objects) {
            return state;
          }

          return commit(state, {
            ...state.document,
            objects,
          });
        }),
      applyTwoDLayout: (id) =>
        set((state) => {
          const objects = applyTwoDLayoutToChildren(state.document.objects, id);

          if (objects === state.document.objects) {
            return state;
          }

          return commit(state, {
            ...state.document,
            objects,
          });
        }),
      addModelObject: (model) =>
        set((state) => {
          const baseName = model.fileName.replace(/\.(glb|gltf|obj|stl|splat)$/i, "").trim();
          const object = createSceneObject("model", baseName || "Imported Model");
          object.model = model;

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      addImageObject: (image) =>
        set((state) => {
          const baseName = image.fileName.replace(/\.[^.]+$/i, "").trim();
          const object = createSceneObject("image", baseName || "Imported Image");
          object.image = image;
          object.transform.position = [0, 1.1, 0];
          object.material = {
            ...object.material,
            color: "#ffffff",
            roughness: 0.62,
            metalness: 0,
          };

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      addVideoObject: (video) =>
        set((state) => {
          const baseName = video.fileName.replace(/\.[^.]+$/i, "").trim();
          const object = createSceneObject("video", baseName || "Imported Video");
          object.video = video;
          object.transform.position = [0, 1.1, 0];
          object.material = {
            ...object.material,
            color: "#ffffff",
            roughness: 0.7,
            metalness: 0,
          };

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      addAudioObject: (audio) =>
        set((state) => {
          const object = createAudioSceneObject(audio);

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      addSvgObject: (svg) =>
        set((state) => {
          const baseName = svg.fileName.replace(/\.svg$/i, "").trim();
          const object = createSceneObject("svg", baseName || "Imported SVG");
          object.svg = svg;
          object.transform.position = [0, 1.1, 0];
          object.material = {
            ...object.material,
            color: "#ffffff",
            roughness: 0.6,
            metalness: 0,
          };

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      addFigmaObject: (figma) =>
        set((state) => {
          const object = createSceneObject("figma", figma.name || "Figma Preview");
          object.figma = figma;
          object.transform.position = [0, 1.2, 0];
          object.material = {
            ...object.material,
            color: "#ffffff",
            roughness: 0.68,
            metalness: 0,
          };

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      addSplineObject: (spline) =>
        set((state) => {
          const object = createSceneObject("spline", spline.name || "Spline Scene");
          object.spline = structuredClone(spline);
          object.transform.position = [0, 1.2, 0];
          object.material = {
            ...object.material,
            color: "#ffffff",
            roughness: 0.72,
            metalness: 0,
          };

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      instantiateBuiltInTemplate: (templateId) =>
        set((state) => {
          const template = createBuiltInTemplateObjects(templateId);

          if (!template) {
            return state;
          }

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, ...template.objects],
            },
            template.rootObjectId,
          );
        }),
      createComponentFromSelection: () =>
        set((state) => {
          if (!state.selectedObjectId) {
            return state;
          }

          const source = state.document.objects.find((object) => object.id === state.selectedObjectId);

          if (!source) {
            return state;
          }

          const baseName = `${source.name} Component`;
          const existingNames = new Set((state.document.components ?? []).map((component) => component.name));
          let name = baseName;
          let suffix = 2;

          while (existingNames.has(name)) {
            name = `${baseName} ${suffix}`;
            suffix += 1;
          }

          const component = createComponentFromObject(state.document.objects, source.id, name);

          if (!component) {
            return state;
          }

          return commit(state, {
            ...state.document,
            components: [...(state.document.components ?? []), component],
          });
        }),
      instantiateComponent: (componentId) =>
        set((state) => {
          const component = (state.document.components ?? []).find((entry) => entry.id === componentId);

          if (!component) {
            return state;
          }

          const instance = createComponentInstance(component);

          if (!instance.rootObjectId) {
            return state;
          }

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, ...instance.objects],
            },
            instance.rootObjectId,
          );
        }),
      deleteComponent: (componentId) =>
        set((state) => {
          const components = (state.document.components ?? []).filter((component) => component.id !== componentId);

          if (components.length === (state.document.components ?? []).length) {
            return state;
          }

          return commit(state, {
            ...state.document,
            components,
          });
        }),
      importComponentLibrary: (components) =>
        set((state) => {
          if (components.length === 0) {
            return state;
          }

          return commit(state, {
            ...state.document,
            components: mergeComponentLibrary(state.document.components ?? [], components),
          });
        }),
      createAudioAssetFromSelection: (name) =>
        set((state) => {
          if (!state.selectedObjectId) {
            return state;
          }

          const source = state.document.objects.find((object) => object.id === state.selectedObjectId);

          if (!source?.audio) {
            return state;
          }

          const audioAssets = state.document.audioAssets ?? [];
          const now = new Date().toISOString();
          const baseName = name ?? source.name;
          const audioAsset: SceneAudioAsset = {
            id: nanoid(),
            name: getUniqueAudioAssetName(audioAssets, baseName),
            audio: structuredClone(source.audio),
            createdAt: now,
            updatedAt: now,
          };

          return commit(state, {
            ...state.document,
            audioAssets: [...audioAssets, audioAsset],
          });
        }),
      instantiateAudioAsset: (assetId) =>
        set((state) => {
          const asset = (state.document.audioAssets ?? []).find((entry) => entry.id === assetId);

          if (!asset) {
            return state;
          }

          const object = createAudioSceneObject(asset.audio, asset.name);

          return commit(
            state,
            {
              ...state.document,
              objects: [...state.document.objects, object],
            },
            object.id,
          );
        }),
      deleteAudioAsset: (assetId) =>
        set((state) => {
          const audioAssets = (state.document.audioAssets ?? []).filter((asset) => asset.id !== assetId);

          if (audioAssets.length === (state.document.audioAssets ?? []).length) {
            return state;
          }

          return commit(state, {
            ...state.document,
            audioAssets,
          });
        }),
      importAudioAssets: (assets) =>
        set((state) => {
          if (assets.length === 0) {
            return state;
          }

          return commit(state, {
            ...state.document,
            audioAssets: mergeAudioLibrary(state.document.audioAssets ?? [], assets),
          });
        }),
      createMaterialAssetFromSelection: (name) =>
        set((state) => {
          if (!state.selectedObjectId) {
            return state;
          }

          const source = state.document.objects.find((object) => object.id === state.selectedObjectId);

          if (!source) {
            return state;
          }

          const materialAssets = state.document.materialAssets ?? [];
          const now = new Date().toISOString();
          const baseName = name ?? `${source.name} Material`;
          const materialAsset: SceneMaterialAsset = {
            id: nanoid(),
            name: getUniqueMaterialAssetName(materialAssets, baseName),
            material: structuredClone(source.material),
            createdAt: now,
            updatedAt: now,
          };

          return commit(state, {
            ...state.document,
            materialAssets: [...materialAssets, materialAsset],
          });
        }),
      deleteMaterialAsset: (assetId) =>
        set((state) => {
          const materialAssets = (state.document.materialAssets ?? []).filter((asset) => asset.id !== assetId);

          if (materialAssets.length === (state.document.materialAssets ?? []).length) {
            return state;
          }

          return commit(state, {
            ...state.document,
            materialAssets,
          });
        }),
      importMaterialAssets: (assets) =>
        set((state) => {
          if (assets.length === 0) {
            return state;
          }

          return commit(state, {
            ...state.document,
            materialAssets: mergeMaterialLibrary(state.document.materialAssets ?? [], assets),
          });
        }),
      addScene: () =>
        set((state) => {
          const currentDocument = syncActiveScene(state.document);
          const scenes = currentDocument.scenes ?? [];
          const name = getUniqueSceneName(scenes, "Scene");
          const template = createDefaultDocument(name);
          const scene = createSceneSnapshotFromTemplate(template, nanoid(), name);
          const document = switchDocumentToScene(
            {
              ...currentDocument,
              scenes: [...scenes, scene],
            },
            scene,
          );

          return commit(state, document, document.objects[0]?.id ?? null);
        }),
      deleteScene: (id) =>
        set((state) => {
          const currentDocument = syncActiveScene(state.document);
          const scenes = currentDocument.scenes ?? [];

          if (scenes.length <= 1) {
            return state;
          }

          const remainingScenes = scenes.filter((scene) => scene.id !== id);

          if (remainingScenes.length === scenes.length) {
            return state;
          }

          const nextScene = currentDocument.activeSceneId === id ? remainingScenes[0] : remainingScenes.find((scene) => scene.id === currentDocument.activeSceneId) ?? remainingScenes[0];
          const document = switchDocumentToScene(
            {
              ...currentDocument,
              scenes: remainingScenes,
            },
            nextScene,
          );

          return commit(state, document, document.objects[0]?.id ?? null);
        }),
      duplicateScene: (id) =>
        set((state) => {
          const currentDocument = syncActiveScene(state.document);
          const scenes = currentDocument.scenes ?? [];
          const source = scenes.find((scene) => scene.id === id);

          if (!source) {
            return state;
          }

          const now = new Date().toISOString();
          const scene = {
            ...structuredClone(source),
            id: nanoid(),
            name: getUniqueSceneName(scenes, `${source.name} Copy`),
            createdAt: now,
            updatedAt: now,
          };
          const document = switchDocumentToScene(
            {
              ...currentDocument,
              scenes: [...scenes, scene],
            },
            scene,
          );

          return commit(state, document, document.objects[0]?.id ?? null);
        }),
      moveScene: (id, direction) =>
        set((state) => {
          const currentDocument = syncActiveScene(state.document);
          const scenes = currentDocument.scenes ?? [];
          const currentIndex = scenes.findIndex((scene) => scene.id === id);
          const nextIndex = currentIndex + direction;

          if (currentIndex < 0 || nextIndex < 0 || nextIndex >= scenes.length) {
            return state;
          }

          return commit(state, {
            ...currentDocument,
            scenes: moveItem(scenes, currentIndex, nextIndex),
          });
        }),
      renameScene: (id, name) =>
        set((state) => {
          const trimmedName = name.trim();

          if (!trimmedName) {
            return state;
          }

          const currentDocument = syncActiveScene(state.document);
          const scenes = currentDocument.scenes ?? [];

          if (!scenes.some((scene) => scene.id === id)) {
            return state;
          }

          return commit(state, {
            ...currentDocument,
            name: currentDocument.activeSceneId === id ? trimmedName : currentDocument.name,
            scenes: scenes.map((scene) => (scene.id === id ? { ...scene, name: trimmedName, updatedAt: new Date().toISOString() } : scene)),
          });
        }),
      switchScene: (id) =>
        set((state) => {
          const currentDocument = syncActiveScene(state.document);
          const scene = currentDocument.scenes?.find((entry) => entry.id === id);

          if (!scene || scene.id === currentDocument.activeSceneId) {
            return state;
          }

          const document = switchDocumentToScene(currentDocument, scene);

          return commit(state, document, document.objects[0]?.id ?? null);
        }),
      setAnimationKeyframe: (id, property, time) =>
        set((state) => {
          const object = state.document.objects.find((entry) => entry.id === id);

          if (!object || object.locked) {
            return state;
          }

          const tracks = state.document.animationTracks ?? [];
          const existingTrack = tracks.find((track) => track.objectId === id && track.property === property);
          const value = readAnimationPropertyValue(object, property);

          if (value === null) {
            return state;
          }

          const nextTrack = existingTrack ? upsertAnimationKeyframe(existingTrack, value, clampAnimationTime(time)) : createAnimationTrack(id, property, value, clampAnimationTime(time));
          const animationTracks = existingTrack ? tracks.map((track) => (track.id === existingTrack.id ? nextTrack : track)) : [...tracks, nextTrack];

          return commit(state, {
            ...state.document,
            animationTracks,
          });
        }),
      setObjectAnimationDuration: (id, duration) =>
        set((state) => {
          const nextDuration = Math.min(120, Math.max(0.05, duration));
          const tracks = state.document.animationTracks ?? [];
          const objectTracks = tracks.filter((track) => track.objectId === id);
          const currentDuration = Math.max(0, ...objectTracks.map(getTrackDuration));

          if (objectTracks.length === 0 || currentDuration <= 0) {
            return state;
          }

          const scale = nextDuration / currentDuration;

          return commit(state, {
            ...state.document,
            animationTracks: tracks.map((track) =>
              track.objectId === id
                ? {
                    ...track,
                    keyframes: track.keyframes.map((keyframe) => ({
                      ...keyframe,
                      time: clampAnimationTime(keyframe.time * scale),
                    })),
                  }
                : track,
            ),
          });
        }),
      updateAnimationTrack: (id, property, trackPatch) =>
        set((state) => {
          const tracks = state.document.animationTracks ?? [];
          const animationTracks = tracks.map((track) => (track.objectId === id && track.property === property ? { ...track, ...trackPatch } : track));

          return animationTracks === tracks
            ? state
            : commit(state, {
                ...state.document,
                animationTracks,
              });
        }),
      updateAnimationKeyframeTime: (id, property, keyframeId, time) =>
        set((state) => {
          const tracks = state.document.animationTracks ?? [];
          const animationTracks = tracks.map((track) =>
            track.objectId === id && track.property === property
              ? {
                  ...track,
                  keyframes: track.keyframes
                    .map((keyframe) => (keyframe.id === keyframeId ? { ...keyframe, time: clampAnimationTime(time) } : keyframe))
                    .sort((left, right) => left.time - right.time),
                }
              : track,
          );

          return commit(state, {
            ...state.document,
            animationTracks,
          });
        }),
      removeAnimationKeyframe: (id, property, keyframeId) =>
        set((state) => {
          const tracks = state.document.animationTracks ?? [];
          const animationTracks = tracks.flatMap((track) => {
            if (track.objectId !== id || track.property !== property) {
              return [track];
            }

            const keyframes = track.keyframes.filter((keyframe) => keyframe.id !== keyframeId);

            return keyframes.length ? [{ ...track, keyframes }] : [];
          });

          return commit(state, {
            ...state.document,
            animationTracks,
          });
        }),
      removeAnimationTrack: (id, property) =>
        set((state) => {
          const tracks = state.document.animationTracks ?? [];
          const animationTracks = tracks.filter((track) => track.objectId !== id || track.property !== property);

          if (animationTracks.length === tracks.length) {
            return state;
          }

          return commit(state, {
            ...state.document,
            animationTracks,
          });
        }),
      updateObject: (id, updater) =>
        set((state) =>
          commit(state, {
            ...state.document,
            objects: state.document.objects.map((object) => (object.id === id && !object.locked ? updater(object) : object)),
          }),
        ),
      updateTransform: (id, transform) =>
        get().updateObject(id, (object) => ({
          ...object,
          transform: {
            ...object.transform,
            ...transform,
          },
        })),
      beginViewportTransform: (id) =>
        set((state) => {
          const object = state.document.objects.find((entry) => entry.id === id);

          if (!object || object.locked) {
            return state;
          }

          return {
            past: [...state.past.slice(-49), cloneForHistory(state)],
            future: [],
          };
        }),
      applyViewportTransform: (id, transform) =>
        set((state) => ({
          document: withUpdatedAt({
            ...state.document,
            objects: state.document.objects.map((object) => (object.id === id && !object.locked ? { ...object, transform } : object)),
          }),
        })),
      updateConstraints: (id, constraints) =>
        get().updateObject(id, (object) => ({
          ...object,
          constraints: {
            ...object.constraints,
            ...constraints,
          },
        })),
      updateMaterial: (id, material) =>
        get().updateObject(id, (object) => ({
          ...object,
          material: {
            ...object.material,
            ...material,
          },
        })),
      updateGeometry: (id, geometry) =>
        get().updateObject(id, (object) => ({
          ...object,
          geometry: {
            ...object.geometry,
            ...geometry,
          },
        })),
      updateText: (id, text) =>
        get().updateObject(id, (object) => ({
          ...object,
          text: {
            content: object.text?.content ?? "Text",
            fontSize: object.text?.fontSize ?? 0.72,
            maxWidth: object.text?.maxWidth ?? 6,
            ...text,
          },
        })),
      updateLight: (id, light) =>
        get().updateObject(id, (object) => ({
          ...object,
          light: {
            color: object.light?.color ?? "#ffffff",
            intensity: object.light?.intensity ?? 2.4,
            distance: object.light?.distance ?? 12,
            angle: object.light?.angle ?? 0.65,
            penumbra: object.light?.penumbra ?? 0.35,
            castShadow: object.light?.castShadow ?? true,
            shadowRadius: object.light?.shadowRadius ?? 2.2,
            shadowBias: object.light?.shadowBias ?? -0.0004,
            ...light,
          },
        })),
      updateCamera: (id, camera) =>
        get().updateObject(id, (object) => ({
          ...object,
          camera: {
            fov: object.camera?.fov ?? 48,
            near: object.camera?.near ?? 0.1,
            far: object.camera?.far ?? 1000,
            ...camera,
          },
        })),
      updateInteraction: (id, interaction) =>
        get().updateObject(id, (object) => ({
          ...object,
          interaction: {
            ...object.interaction,
            ...interaction,
          },
        })),
      updateVector: (id, group, index, value) =>
        get().updateObject(id, (object) => ({
          ...object,
          transform: {
            ...object.transform,
            [group]: moveVec3(object.transform[group], index, value),
          },
        })),
      updatePivot: (id, index, value) =>
        get().updateObject(id, (object) => ({
          ...object,
          pivot: moveVec3(resolvePivot(object) ?? defaultPivot, index, value),
        })),
      groupSelectedObject: () =>
        set((state) => {
          if (!state.selectedObjectId) {
            return state;
          }

          const source = state.document.objects.find((object) => object.id === state.selectedObjectId);

          if (!source || source.kind === "group") {
            return state;
          }

          const group = createSceneObject("group", `${source.name} Group`);
          group.parentId = source.parentId ?? null;
          group.transform = {
            position: [...source.transform.position],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          };

          return commit(
            state,
            {
              ...state.document,
              objects: [
                ...state.document.objects.map((object) =>
                  object.id === source.id
                    ? {
                        ...object,
                        parentId: group.id,
                        transform: {
                          ...object.transform,
                          position: [0, 0, 0] as Vec3,
                        },
                      }
                    : object,
                ),
                group,
              ],
            },
            group.id,
          );
        }),
      ungroupObject: (id) =>
        set((state) => {
          const group = state.document.objects.find((object) => object.id === id && object.kind === "group");

          if (!group) {
            return state;
          }

          const nextObjects = state.document.objects.flatMap((object) => {
            if (object.id === id) {
              return [];
            }

            if (object.parentId !== id) {
              return [object];
            }

            return [
              {
                ...object,
                parentId: group.parentId ?? null,
                transform: {
                  ...object.transform,
                  position: offsetVec3(object.transform.position, group.transform.position),
                },
              },
            ];
          });

          return commit(
            state,
            {
              ...state.document,
              objects: nextObjects,
            },
            null,
          );
        }),
      duplicateObject: (id) =>
        set((state) => {
          const source = state.document.objects.find((object) => object.id === id);

          if (!source) {
            return state;
          }

          const descendantIds = getDescendantIds(state.document.objects, id);
          const sourceIds = new Set([id, ...descendantIds]);
          const idMap = new Map<string, string>();
          for (const sourceId of sourceIds) {
            idMap.set(sourceId, nanoid());
          }

          const copies = state.document.objects
            .filter((object) => sourceIds.has(object.id))
            .map((object) => ({
              ...structuredClone(object),
              id: idMap.get(object.id) ?? nanoid(),
              parentId: object.parentId && sourceIds.has(object.parentId) ? (idMap.get(object.parentId) ?? null) : object.parentId,
              name: object.id === source.id ? `${object.name} Copy` : object.name,
              transform: {
                ...object.transform,
                position: object.id === source.id ? offsetVec3(object.transform.position, [0.6, 0, 0.6]) : object.transform.position,
              },
            }));
          const copiedRoot = copies.find((object) => object.name === `${source.name} Copy`);
          const copiedTracks = (state.document.animationTracks ?? [])
            .filter((track) => sourceIds.has(track.objectId))
            .map((track) => ({
              ...structuredClone(track),
              id: nanoid(),
              objectId: idMap.get(track.objectId) ?? track.objectId,
              keyframes: track.keyframes.map((keyframe) => ({
                ...structuredClone(keyframe),
                id: nanoid(),
              })),
            }));

          return commit(
            state,
            {
              ...state.document,
              animationTracks: [...(state.document.animationTracks ?? []), ...copiedTracks],
              objects: [...state.document.objects, ...copies],
            },
            copiedRoot?.id ?? null,
          );
        }),
      deleteObject: (id) =>
        set((state) => {
          const removeIds = new Set([id, ...getDescendantIds(state.document.objects, id)]);

          return commit(
            state,
            {
              ...state.document,
              activeCameraId: state.document.activeCameraId && removeIds.has(state.document.activeCameraId) ? null : state.document.activeCameraId,
              animationTracks: (state.document.animationTracks ?? []).filter((track) => !removeIds.has(track.objectId)),
              objects: state.document.objects.filter((object) => !removeIds.has(object.id)),
            },
            state.selectedObjectId && removeIds.has(state.selectedObjectId) ? null : state.selectedObjectId,
          );
        }),
      resetDocument: () =>
        set((state) => ({
          ...commit(state, createDefaultDocument("Essence Spline Scene"), null),
          activeProjectId: null,
          lastSavedAt: null,
          lastSavedDocument: null,
          runtimeCameraId: null,
          runtimeAnimationOverrides: {},
          runtimeAnimationStartedAt: 0,
          runtimeObjectInstances: [],
          runtimeVisibilityOverrides: {},
          runtimePropertyOverrides: {},
          runtimeParticleOverrides: {},
          runtimePhysicsTransforms: {},
          runtimePhysicsResetKey: state.runtimePhysicsResetKey + 1,
          runtimeTransitionOverrides: {},
          runtimeSceneSettings: null,
          runtimeSceneStateId: null,
        })),
      loadDocument: (document) => {
        const parsed = sceneDocumentSchema.safeParse(document);

        if (!parsed.success) {
          throw new Error("The selected file is not a valid Essence Spline scene.");
        }

        const hydratedDocument = getPreparedDocument(parsed.data);

        set((state) => ({
          ...commit(state, hydratedDocument, hydratedDocument.objects[0]?.id ?? null),
          activeProjectId: null,
          lastSavedAt: null,
          lastSavedDocument: null,
          runtimeCameraId: null,
          runtimeAnimationOverrides: {},
          runtimeAnimationStartedAt: 0,
          runtimeObjectInstances: [],
          runtimeVisibilityOverrides: {},
          runtimePropertyOverrides: {},
          runtimeParticleOverrides: {},
          runtimePhysicsTransforms: {},
          runtimePhysicsResetKey: state.runtimePhysicsResetKey + 1,
          runtimeTransitionOverrides: {},
          runtimeSceneSettings: null,
          runtimeSceneStateId: null,
        }));
      },
      loadProject: (projectId, document, savedAt) => {
        const parsed = sceneDocumentSchema.safeParse(document);

        if (!parsed.success) {
          throw new Error("The selected project does not contain a valid scene.");
        }

        const hydratedDocument = getPreparedDocument(parsed.data);

        set({
          document: hydratedDocument,
          activeProjectId: projectId,
          lastSavedAt: savedAt ?? new Date().toISOString(),
          lastSavedDocument: hydratedDocument,
          selectedObjectId: hydratedDocument.objects[0]?.id ?? null,
          past: [],
          future: [],
          runtimeCameraId: null,
          runtimeAnimationOverrides: {},
          runtimeAnimationStartedAt: 0,
          runtimeObjectInstances: [],
          runtimeVisibilityOverrides: {},
          runtimePropertyOverrides: {},
          runtimeParticleOverrides: {},
          runtimePhysicsTransforms: {},
          runtimePhysicsResetKey: get().runtimePhysicsResetKey + 1,
          runtimeTransitionOverrides: {},
          runtimeSceneSettings: null,
          runtimeSceneStateId: null,
        });
      },
      replaceDocument: (document, selectedObjectId) => {
        const parsed = sceneDocumentSchema.safeParse(document);

        if (!parsed.success) {
          throw new Error("The updated scene is not a valid Essence Spline document.");
        }

        const hydratedDocument = getPreparedDocument(parsed.data);

        set((state) => ({
          ...commit(state, hydratedDocument, selectedObjectId ?? state.selectedObjectId),
          runtimePhysicsTransforms: {},
          runtimePhysicsResetKey: state.runtimePhysicsResetKey + 1,
        }));
      },
      markProjectSaved: (projectId, savedAt, document) =>
        set((state) => ({
          activeProjectId: projectId,
          lastSavedAt: savedAt ?? new Date().toISOString(),
          lastSavedDocument: document ? getPreparedDocument(document) : structuredClone(state.document),
        })),
      detachProject: () =>
        set({
          activeProjectId: null,
          lastSavedAt: null,
          lastSavedDocument: null,
        }),
      undo: () =>
        set((state) => {
          const previous = state.past.at(-1);

          if (!previous) {
            return state;
          }

          return {
            document: previous.document,
            selectedObjectId: previous.selectedObjectId,
            past: state.past.slice(0, -1),
            future: [cloneForHistory(state), ...state.future].slice(0, 50),
          };
        }),
      redo: () =>
        set((state) => {
          const next = state.future[0];

          if (!next) {
            return state;
          }

          return {
            document: next.document,
            selectedObjectId: next.selectedObjectId,
            past: [...state.past, cloneForHistory(state)].slice(-50),
            future: state.future.slice(1),
          };
        }),
    }),
    {
      name: "essence-spline-editor",
      partialize: (state) => ({
        document: state.document,
        activeProjectId: state.activeProjectId,
        lastSavedAt: state.lastSavedAt,
        selectedObjectId: state.selectedObjectId,
        mode: state.mode,
        surfaceMode: state.surfaceMode,
      }),
    },
  ),
);

export type { EditorMode, EditorSurfaceMode };
