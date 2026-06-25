import type { ModelImportDiagnostics } from "../types";

export type CadConversionTarget = "glb" | "obj" | "stl";
export type CadValidationSeverity = "info" | "warning" | "error";
export type CadSourceKind = "direct-model" | "exchange" | "native-cad" | "splat";
export type CadSourceUnit = "unknown" | "millimeter" | "centimeter" | "meter" | "inch" | "foot";
export type CadComplexity = "low" | "medium" | "high" | "extreme";

export interface CadValidationIssue {
  detail: string;
  id: string;
  label: string;
  severity: CadValidationSeverity;
}

export interface CadUnitMetadata {
  confidence: "assumed" | "detected" | "metadata-required";
  scaleToMeters: number;
  sourceUnit: CadSourceUnit;
}

export interface CadTessellationBudget {
  angularDeflection: number;
  estimatedTriangleCount: number;
  linearDeflection: number;
  maxRecommendedTriangles: number;
  target: CadConversionTarget;
}

export interface CadMeshDiagnostics {
  complexity: CadComplexity;
  estimatedTriangleCount: number;
  estimatedVertexCount: number;
  externalAssetRisk: boolean;
  sourceBytes: number;
}

export interface CadConversionValidationReport {
  issues: CadValidationIssue[];
  meshDiagnostics: CadMeshDiagnostics;
  summary: string;
  tessellationBudget: CadTessellationBudget;
  unitMetadata: CadUnitMetadata;
}

const unitHints: Array<{ pattern: RegExp; scaleToMeters: number; sourceUnit: CadSourceUnit }> = [
  { pattern: /(?:^|[-_.\s])mm(?:[-_.\s]|$)|millimeters?/iu, scaleToMeters: 0.001, sourceUnit: "millimeter" },
  { pattern: /(?:^|[-_.\s])cm(?:[-_.\s]|$)|centimeters?/iu, scaleToMeters: 0.01, sourceUnit: "centimeter" },
  { pattern: /(?:^|[-_.\s])m(?:[-_.\s]|$)|meters?/iu, scaleToMeters: 1, sourceUnit: "meter" },
  { pattern: /(?:^|[-_.\s])in(?:[-_.\s]|$)|inches/iu, scaleToMeters: 0.0254, sourceUnit: "inch" },
  { pattern: /(?:^|[-_.\s])ft(?:[-_.\s]|$)|feet|foot/iu, scaleToMeters: 0.3048, sourceUnit: "foot" },
];

function estimateMegabytes(bytes: number) {
  return bytes / (1024 * 1024);
}

function estimateTriangles(bytes: number, target: CadConversionTarget, sourceKind: CadSourceKind) {
  const megabytes = estimateMegabytes(bytes);
  const targetMultiplier = target === "glb" ? 12000 : target === "obj" ? 9000 : 7000;
  const sourceMultiplier = sourceKind === "native-cad" ? 1.45 : sourceKind === "exchange" ? 1.15 : sourceKind === "splat" ? 0.25 : 1;

  return Math.max(200, Math.round(megabytes * targetMultiplier * sourceMultiplier));
}

function getComplexity(triangles: number): CadComplexity {
  if (triangles > 300000) {
    return "extreme";
  }

  if (triangles > 140000) {
    return "high";
  }

  if (triangles > 50000) {
    return "medium";
  }

  return "low";
}

function inferUnitMetadata(fileName: string, sourceKind: CadSourceKind, target: CadConversionTarget): CadUnitMetadata {
  const hint = unitHints.find((candidate) => candidate.pattern.test(fileName));

  if (hint) {
    return {
      confidence: "detected",
      scaleToMeters: hint.scaleToMeters,
      sourceUnit: hint.sourceUnit,
    };
  }

  if (target === "glb" && sourceKind === "direct-model") {
    return {
      confidence: "assumed",
      scaleToMeters: 1,
      sourceUnit: "meter",
    };
  }

  return {
    confidence: "metadata-required",
    scaleToMeters: 1,
    sourceUnit: "unknown",
  };
}

function createTessellationBudget(bytes: number, target: CadConversionTarget, sourceKind: CadSourceKind): CadTessellationBudget {
  const megabytes = estimateMegabytes(bytes);
  const nativeCad = sourceKind === "native-cad";
  const highComplexity = megabytes > 24;

  return {
    angularDeflection: highComplexity ? 0.8 : nativeCad ? 0.5 : 0.35,
    estimatedTriangleCount: estimateTriangles(bytes, target, sourceKind),
    linearDeflection: highComplexity ? 0.18 : nativeCad ? 0.1 : 0.05,
    maxRecommendedTriangles: target === "glb" ? 220000 : 160000,
    target,
  };
}

function createIssues(unitMetadata: CadUnitMetadata, tessellationBudget: CadTessellationBudget, meshDiagnostics: CadMeshDiagnostics, sourceKind: CadSourceKind) {
  const issues: CadValidationIssue[] = [];

  if (unitMetadata.sourceUnit === "unknown") {
    issues.push({
      detail: "The source units could not be detected from the filename or browser metadata. Confirm scale after conversion before publishing.",
      id: "missing-unit-metadata",
      label: "Unknown units",
      severity: sourceKind === "native-cad" ? "warning" : "info",
    });
  }

  if (tessellationBudget.estimatedTriangleCount > tessellationBudget.maxRecommendedTriangles) {
    issues.push({
      detail: `Estimated ${tessellationBudget.estimatedTriangleCount.toLocaleString()} triangles exceeds the ${tessellationBudget.maxRecommendedTriangles.toLocaleString()} browser budget for ${tessellationBudget.target.toUpperCase()}. Increase deflection, decimate, or split the mesh.`,
      id: "tessellation-budget",
      label: "High tessellation",
      severity: "warning",
    });
  }

  if (meshDiagnostics.externalAssetRisk) {
    issues.push({
      detail: "This exchange format often references external textures or sidecar files. Re-open the converted GLB before publishing.",
      id: "external-asset-risk",
      label: "External asset risk",
      severity: "info",
    });
  }

  if (meshDiagnostics.complexity === "extreme") {
    issues.push({
      detail: "The source is large enough to risk slow upload, viewport interaction, and public embeds on low-end devices.",
      id: "browser-performance-risk",
      label: "Browser performance risk",
      severity: "warning",
    });
  }

  return issues;
}

export function createCadConversionValidationReport(file: Pick<File, "name" | "size">, sourceKind: CadSourceKind, target: CadConversionTarget): CadConversionValidationReport {
  const tessellationBudget = createTessellationBudget(file.size, target, sourceKind);
  const unitMetadata = inferUnitMetadata(file.name, sourceKind, target);
  const meshDiagnostics: CadMeshDiagnostics = {
    complexity: getComplexity(tessellationBudget.estimatedTriangleCount),
    estimatedTriangleCount: tessellationBudget.estimatedTriangleCount,
    estimatedVertexCount: Math.round(tessellationBudget.estimatedTriangleCount * 0.55),
    externalAssetRisk: sourceKind === "exchange" && target === "glb",
    sourceBytes: file.size,
  };
  const issues = createIssues(unitMetadata, tessellationBudget, meshDiagnostics, sourceKind);

  return {
    issues,
    meshDiagnostics,
    summary: `${meshDiagnostics.complexity} complexity, ${meshDiagnostics.estimatedTriangleCount.toLocaleString()} estimated triangles, ${unitMetadata.sourceUnit === "unknown" ? "unit scale needs verification" : `${unitMetadata.sourceUnit} units`}.`,
    tessellationBudget,
    unitMetadata,
  };
}

export function createModelImportDiagnostics(format: ModelImportDiagnostics["sourceFormat"], validation: CadConversionValidationReport): ModelImportDiagnostics {
  return {
    complexity: validation.meshDiagnostics.complexity,
    estimatedTriangleCount: validation.meshDiagnostics.estimatedTriangleCount,
    estimatedVertexCount: validation.meshDiagnostics.estimatedVertexCount,
    scaleToMeters: validation.unitMetadata.scaleToMeters,
    sourceBytes: validation.meshDiagnostics.sourceBytes,
    sourceFormat: format,
    sourceUnit: validation.unitMetadata.sourceUnit,
    warnings: validation.issues.map((issue) => issue.detail),
  };
}
