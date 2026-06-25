import { createHash } from "node:crypto";

export type NativeCadKernelFormat = "IGES" | "SAT" | "STEP" | "STL";
export type NativeCadKernelCapabilityStatus = "ready" | "review" | "unsupported";

export interface NativeCadKernelCapabilityRow {
  adapter: string;
  capabilityHash: string;
  format: NativeCadKernelFormat;
  nextAction: string;
  status: NativeCadKernelCapabilityStatus;
  tessellationQuality: string;
  unitHandling: string;
  unsupportedFeatures: string;
}

export interface NativeCadKernelCapabilityMatrixReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: NativeCadKernelCapabilityRow[];
  summary: {
    capabilityHash: string;
    capabilityScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: "blocked" | "ready" | "review";
    unsupportedCount: number;
  };
  workspaceId: string;
}

export interface CreateNativeCadKernelCapabilityMatrixInput {
  generatedAt?: string;
  igesStatus?: NativeCadKernelCapabilityStatus;
  satStatus?: NativeCadKernelCapabilityStatus;
  stepStatus?: NativeCadKernelCapabilityStatus;
  stlStatus?: NativeCadKernelCapabilityStatus;
  workspaceId?: string;
}

const formatRank: Record<NativeCadKernelFormat, number> = {
  STEP: 0,
  IGES: 1,
  SAT: 2,
  STL: 3,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function nextActionFor(input: { format: NativeCadKernelFormat; status: NativeCadKernelCapabilityStatus }) {
  if (input.status === "unsupported") {
    return `Do not promise ${input.format} native CAD conversion until a kernel adapter and fixture evidence exist.`;
  }

  if (input.status === "review") {
    return `Validate ${input.format} unit handling, tessellation quality, and unsupported feature explanations before release.`;
  }

  return `Keep ${input.format} CAD capability evidence current with conversion fixtures and export diagnostics.`;
}

function createRow(input: {
  adapter: string;
  format: NativeCadKernelFormat;
  status: NativeCadKernelCapabilityStatus;
  tessellationQuality: string;
  unitHandling: string;
  unsupportedFeatures: string;
}) {
  const nextAction = nextActionFor({
    format: input.format,
    status: input.status,
  });
  const capabilityHash = sha256({
    adapter: input.adapter,
    format: input.format,
    nextAction,
    status: input.status,
    tessellationQuality: input.tessellationQuality,
    unitHandling: input.unitHandling,
    unsupportedFeatures: input.unsupportedFeatures,
  });

  return {
    ...input,
    capabilityHash,
    nextAction,
  } satisfies NativeCadKernelCapabilityRow;
}

function createRows(input: Required<Pick<CreateNativeCadKernelCapabilityMatrixInput, "igesStatus" | "satStatus" | "stepStatus" | "stlStatus">>) {
  return [
    createRow({
      adapter: "OCCT or FreeCAD native BREP bridge",
      format: "STEP",
      status: input.stepStatus,
      tessellationQuality: "B-rep to mesh with linear/angular deflection diagnostics required",
      unitHandling: "AP203/AP214/AP242 metadata must resolve to scene units or block import",
      unsupportedFeatures: "PMI, assembly constraints, exact NURBS editing, and parametric history are not browser-native yet",
    }),
    createRow({
      adapter: "OCCT IGES reader bridge",
      format: "IGES",
      status: input.igesStatus,
      tessellationQuality: "Surface stitching and gap diagnostics required before mesh export",
      unitHandling: "Global section units must be normalized with confidence evidence",
      unsupportedFeatures: "Trimmed surface ambiguity, layers, and legacy entity drift need visible warnings",
    }),
    createRow({
      adapter: "ACIS-compatible converter required",
      format: "SAT",
      status: input.satStatus,
      tessellationQuality: "Not accepted until an ACIS-safe conversion path produces fixture meshes",
      unitHandling: "Unit metadata must be extracted from SAT headers or explicitly requested",
      unsupportedFeatures: "Native ACIS kernel behavior, history features, and exact solid edits are unsupported",
    }),
    createRow({
      adapter: "existing mesh import path",
      format: "STL",
      status: input.stlStatus,
      tessellationQuality: "Mesh-only diagnostics can validate triangle count, bounds, normals, and manifold risk",
      unitHandling: "Unitless STL requires user-selected scene unit or filename metadata",
      unsupportedFeatures: "No B-rep, assemblies, materials, or editable CAD features are present in STL",
    }),
  ].sort((first, second) => formatRank[first.format] - formatRank[second.format]);
}

function summarize(rows: NativeCadKernelCapabilityRow[]): NativeCadKernelCapabilityMatrixReport["summary"] {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const unsupportedCount = rows.filter((row) => row.status === "unsupported").length;
  const status = unsupportedCount >= 3 ? "blocked" : reviewCount > 0 || unsupportedCount > 0 ? "review" : "ready";
  const capabilityScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 23 - unsupportedCount * 14));

  return {
    capabilityHash: sha256(rows.map((row) => row.capabilityHash)),
    capabilityScore,
    nextAction:
      status === "blocked"
        ? "Native CAD kernel coverage is blocked until unsupported formats have adapter contracts and fixture evidence."
        : status === "review"
          ? "Validate review CAD kernel formats before promising native conversion parity."
          : "Native CAD kernel capability matrix is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    unsupportedCount,
  };
}

function createCsv(rows: NativeCadKernelCapabilityRow[]) {
  const header = ["format", "status", "adapter", "unit_handling", "tessellation_quality", "unsupported_features", "next_action"];
  const body = rows.map((row) =>
    [row.format, row.status, row.adapter, row.unitHandling, row.tessellationQuality, row.unsupportedFeatures, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: NativeCadKernelCapabilityRow[];
  summary: NativeCadKernelCapabilityMatrixReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createNativeCadKernelCapabilityMatrix(input: CreateNativeCadKernelCapabilityMatrixInput = {}): NativeCadKernelCapabilityMatrixReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows({
    igesStatus: input.igesStatus ?? "review",
    satStatus: input.satStatus ?? "unsupported",
    stepStatus: input.stepStatus ?? "review",
    stlStatus: input.stlStatus ?? "ready",
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-native-cad-kernel-capability-matrix-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
