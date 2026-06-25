import type { ModelSettings, SceneObject, Transform } from "../types";

export type ModelImportRepairActionId = "unit-scale" | "orient-z-up" | "fallback-material" | "heavy-runtime" | "animation-clips";
export type ModelImportRepairSeverity = "info" | "warning" | "danger";

export interface ModelImportRepairAction {
  available: boolean;
  detail: string;
  id: ModelImportRepairActionId;
  label: string;
  severity: ModelImportRepairSeverity;
}

export interface ModelImportRepairPlan {
  actions: ModelImportRepairAction[];
  availableActions: ModelImportRepairAction[];
  summary: string;
}

function multiplyScale(scale: Transform["scale"], amount: number): Transform["scale"] {
  return [scale[0] * amount, scale[1] * amount, scale[2] * amount];
}

function hasExternalTextureRisk(model: ModelSettings) {
  return model.importDiagnostics?.warnings.some((warning) => /external textures?|sidecar|asset/iu.test(warning)) ?? false;
}

function isHeavyModel(model: ModelSettings) {
  const complexity = model.importDiagnostics?.complexity;

  return complexity === "high" || complexity === "extreme";
}

function createAction(id: ModelImportRepairActionId, label: string, detail: string, severity: ModelImportRepairSeverity, available: boolean): ModelImportRepairAction {
  return {
    available,
    detail,
    id,
    label,
    severity,
  };
}

export function createModelImportRepairPlan(object: SceneObject): ModelImportRepairPlan {
  const model = object.model;

  if (!model) {
    return {
      actions: [],
      availableActions: [],
      summary: "No imported model selected.",
    };
  }

  const diagnostics = model.importDiagnostics;
  const unitScale = diagnostics?.scaleToMeters ?? 1;
  const sourceUnit = diagnostics?.sourceUnit ?? "unknown";
  const textureRisk = hasExternalTextureRisk(model) || model.sourceDataUrl.length === 0;
  const heavyModel = isHeavyModel(model);
  const actions = [
    createAction(
      "unit-scale",
      "Apply unit scale",
      sourceUnit === "unknown" ? "Unit metadata is missing; confirm the source scale before applying a multiplier." : `Scale transform by ${unitScale} from ${sourceUnit} units.`,
      sourceUnit === "unknown" ? "warning" : "info",
      Boolean(diagnostics && sourceUnit !== "meter" && unitScale > 0 && unitScale !== 1),
    ),
    createAction(
      "orient-z-up",
      "Orient Z-up asset",
      "Rotate the model -90 degrees on X for common CAD and OBJ/STL files authored with Z as up.",
      "info",
      model.format === "obj" || model.format === "stl",
    ),
    createAction(
      "fallback-material",
      "Repair material fallback",
      "Replace risky or missing texture references with a neutral viewport material.",
      textureRisk ? "warning" : "info",
      textureRisk,
    ),
    createAction(
      "heavy-runtime",
      "Relax heavy runtime",
      "Disable automatic animation and morph playback for high-complexity imports.",
      heavyModel ? "danger" : "info",
      heavyModel,
    ),
    createAction(
      "animation-clips",
      "Normalize clip playback",
      "Use the default GLTF clip, reset speed, and keep loop playback predictable.",
      "info",
      model.format === "gltf",
    ),
  ];
  const availableActions = actions.filter((action) => action.available);

  return {
    actions,
    availableActions,
    summary:
      availableActions.length > 0
        ? `${availableActions.length} import ${availableActions.length === 1 ? "repair" : "repairs"} available.`
        : "No import repairs needed for this model.",
  };
}

export function applyModelImportRepairAction(object: SceneObject, actionId: ModelImportRepairActionId): SceneObject {
  const model = object.model;

  if (!model) {
    return object;
  }

  if (actionId === "unit-scale") {
    const scaleToMeters = model.importDiagnostics?.scaleToMeters ?? 1;

    if (scaleToMeters <= 0 || scaleToMeters === 1) {
      return object;
    }

    return {
      ...object,
      transform: {
        ...object.transform,
        scale: multiplyScale(object.transform.scale, scaleToMeters),
      },
    };
  }

  if (actionId === "orient-z-up") {
    return {
      ...object,
      transform: {
        ...object.transform,
        rotation: [object.transform.rotation[0] - Math.PI / 2, object.transform.rotation[1], object.transform.rotation[2]],
      },
    };
  }

  if (actionId === "fallback-material") {
    return {
      ...object,
      material: {
        ...object.material,
        color: "#cbd5e1",
        metalness: 0.02,
        roughness: 0.72,
        textureDataUrl: null,
      },
    };
  }

  if (actionId === "heavy-runtime") {
    return {
      ...object,
      model: {
        ...model,
        animationAutoPlay: false,
        morphTargetAutoPlay: false,
        splatPointScale: model.format === "splat" ? Math.min(model.splatPointScale ?? 1, 0.75) : model.splatPointScale,
      },
    };
  }

  if (actionId === "animation-clips") {
    return {
      ...object,
      model: {
        ...model,
        animationClipName: undefined,
        animationLoop: true,
        animationSpeed: 1,
      },
    };
  }

  return object;
}
