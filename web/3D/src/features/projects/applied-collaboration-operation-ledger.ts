import {
  sceneCollaborationOperationSchema,
  type SceneCollaborationOperation,
} from "@/features/editor/scene/scene-collaboration-operations";

const ledgerPrefix = "essence-spline-applied-collaboration-operations";
const maxStoredOperationSignatures = 500;

export interface AppliedCollaborationOperationAcknowledgementTarget {
  key: string;
  label: string;
  scope: "document" | "object" | "order";
}

export interface AppliedCollaborationOperationAcknowledgementSummary {
  detail: string;
  documentTargetCount: number;
  label: string;
  objectTargetCount: number;
  operationCount: number;
  orderTargetCount: number;
  status: "empty" | "tracking";
  targets: AppliedCollaborationOperationAcknowledgementTarget[];
}

function getProjectLedgerPrefix(projectId: string) {
  return `${ledgerPrefix}:${projectId}:`;
}

function getProjectBaselineLedgerKey(projectId: string, since: string) {
  return `${getProjectLedgerPrefix(projectId)}${since}`;
}

function isCurrentBaselineLedgerKey(key: string, projectId: string, since: string) {
  const baselineKey = getProjectBaselineLedgerKey(projectId, since);

  return key === baselineKey || key.startsWith(`${baselineKey}:scene:`);
}

function formatFieldLabel(field: string) {
  const label = field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();

  return label || "field";
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function parseAppliedCollaborationOperationSignature(signature: string): SceneCollaborationOperation | null {
  try {
    const result = sceneCollaborationOperationSchema.safeParse(JSON.parse(signature));

    return result.success ? (result.data as SceneCollaborationOperation) : null;
  } catch {
    return null;
  }
}

function createAppliedCollaborationOperationTarget(
  operation: SceneCollaborationOperation,
): AppliedCollaborationOperationAcknowledgementTarget {
  if (operation.kind === "document-field-set") {
    const fieldLabel = formatFieldLabel(operation.field);

    return {
      key: `document:${operation.field}`,
      label: `Document ${fieldLabel}`,
      scope: "document",
    };
  }

  if (operation.kind === "object-field-set") {
    const fieldLabel = formatFieldLabel(operation.field);

    return {
      key: `object:${operation.objectId}:${operation.field}`,
      label: `${operation.objectName} ${fieldLabel}`,
      scope: "object",
    };
  }

  if (operation.kind === "object-upsert") {
    return {
      key: `object:${operation.objectId}:upsert`,
      label: `${operation.objectName} upsert`,
      scope: "object",
    };
  }

  if (operation.kind === "object-delete") {
    return {
      key: `object:${operation.objectId}:delete`,
      label: `${operation.objectName} delete`,
      scope: "object",
    };
  }

  return {
    key: "order:objects",
    label: "Object order",
    scope: "order",
  };
}

export function getAppliedCollaborationOperationLedgerKey(projectId: string | null, since: string | null, sceneId?: string | null) {
  if (!projectId || !since) {
    return null;
  }

  const baselineKey = getProjectBaselineLedgerKey(projectId, since);

  return sceneId ? `${baselineKey}:scene:${sceneId}` : baselineKey;
}

export function createAppliedCollaborationOperationSignature(operation: SceneCollaborationOperation) {
  return JSON.stringify(operation);
}

export function createAppliedCollaborationOperationSignatures(operations: SceneCollaborationOperation[]) {
  return operations.map(createAppliedCollaborationOperationSignature);
}

export function hasAcknowledgedAllCollaborationOperations(
  operations: SceneCollaborationOperation[],
  operationSignatures: Iterable<string>,
) {
  if (operations.length === 0) {
    return false;
  }

  const acknowledgedSignatures = operationSignatures instanceof Set ? operationSignatures : new Set(operationSignatures);

  return createAppliedCollaborationOperationSignatures(operations).every((signature) => acknowledgedSignatures.has(signature));
}

export function summarizeAppliedCollaborationOperationAcknowledgements(
  operationSignatures: Iterable<string>,
): AppliedCollaborationOperationAcknowledgementSummary {
  const targetMap = new Map<string, AppliedCollaborationOperationAcknowledgementTarget>();
  let operationCount = 0;

  for (const signature of operationSignatures) {
    const operation = parseAppliedCollaborationOperationSignature(signature);

    if (!operation) {
      continue;
    }

    operationCount += 1;
    const target = createAppliedCollaborationOperationTarget(operation);
    targetMap.set(target.key, target);
  }

  const targets = [...targetMap.values()];
  const objectTargetCount = targets.filter((target) => target.scope === "object").length;
  const documentTargetCount = targets.filter((target) => target.scope === "document").length;
  const orderTargetCount = targets.filter((target) => target.scope === "order").length;

  if (!operationCount) {
    return {
      detail: "No partial clean-operation acknowledgements for this save baseline.",
      documentTargetCount: 0,
      label: "No partial",
      objectTargetCount: 0,
      operationCount: 0,
      orderTargetCount: 0,
      status: "empty",
      targets,
    };
  }

  const targetParts = [
    objectTargetCount ? formatCount(objectTargetCount, "object target") : null,
    documentTargetCount ? formatCount(documentTargetCount, "document target") : null,
    orderTargetCount ? formatCount(orderTargetCount, "order target") : null,
  ].filter((part): part is string => Boolean(part));
  const visibleTargets = targets.slice(0, 3).map((target) => target.label);
  const hiddenTargetCount = Math.max(0, targets.length - visibleTargets.length);
  const targetDetail =
    visibleTargets.length > 0
      ? ` Targets: ${visibleTargets.join(", ")}${hiddenTargetCount ? `, +${hiddenTargetCount} more` : ""}.`
      : "";

  return {
    detail: `Partial acknowledgements cover ${formatCount(operationCount, "clean operation")} across ${targetParts.join(", ")}.${targetDetail}`,
    documentTargetCount,
    label: `${operationCount} partial`,
    objectTargetCount,
    operationCount,
    orderTargetCount,
    status: "tracking",
    targets,
  };
}

export function readAppliedCollaborationOperationLedger(key: string | null) {
  if (!key || typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;

    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

export function writeAppliedCollaborationOperationLedger(key: string | null, operationSignatures: Set<string>) {
  if (!key || typeof window === "undefined") {
    return;
  }

  if (operationSignatures.size === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify([...operationSignatures].slice(-maxStoredOperationSignatures)));
}

export function pruneAppliedCollaborationOperationLedgers(projectId: string | null, activeKey: string | null, activeSince?: string | null) {
  if (!projectId || typeof window === "undefined") {
    return;
  }

  const projectPrefix = getProjectLedgerPrefix(projectId);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(projectPrefix) && key !== activeKey && (!activeSince || !isCurrentBaselineLedgerKey(key, projectId, activeSince))) {
      window.localStorage.removeItem(key);
    }
  }
}
