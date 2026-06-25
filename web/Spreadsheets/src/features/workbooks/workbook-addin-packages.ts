import type {
  WorkbookAddInManifest,
  WorkbookAddInSandboxCommand,
  WorkbookAddInSignature,
  WorkbookAddInSignatureStatus,
  WorkbookAutomationPermission,
} from "@/features/workbooks/types";

const ADD_IN_SIGNATURE_ALGORITHM = "essence-package-digest-v1" as const;

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function safeText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string"
    ? value.trim().slice(0, limit) || fallback
    : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function digestPackagePayload(value: unknown) {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `${ADD_IN_SIGNATURE_ALGORITHM}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function normalizeAutomationPermission(
  value: unknown,
): WorkbookAutomationPermission | null {
  return value === "readWorkbook" ||
    value === "writeCells" ||
    value === "formatCells" ||
    value === "manageStructure" ||
    value === "sortAndClean" ||
    value === "registerExtensions"
    ? value
    : null;
}

export function normalizeAutomationPermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.flatMap((item) => {
        const permission = normalizeAutomationPermission(item);
        return permission ? [permission] : [];
      }),
    ),
  );
}

function normalizeCommandRange(value: unknown) {
  if (!isObject(value)) {
    return undefined;
  }

  const startRowIndex = Number(value.startRowIndex);
  const startColumnIndex = Number(value.startColumnIndex);
  const endRowIndex = Number(value.endRowIndex);
  const endColumnIndex = Number(value.endColumnIndex);

  if (
    !Number.isInteger(startRowIndex) ||
    !Number.isInteger(startColumnIndex) ||
    !Number.isInteger(endRowIndex) ||
    !Number.isInteger(endColumnIndex)
  ) {
    return undefined;
  }

  return {
    startRowIndex: Math.max(0, startRowIndex),
    startColumnIndex: Math.max(0, startColumnIndex),
    endRowIndex: Math.max(0, endRowIndex),
    endColumnIndex: Math.max(0, endColumnIndex),
  };
}

export function createDefaultAddInSandboxCommands(
  permissions: WorkbookAutomationPermission[],
): WorkbookAddInSandboxCommand[] {
  if (!permissions.includes("readWorkbook")) {
    return [];
  }

  return [
    {
      id: "addin_command_workbook_summary",
      kind: "workbook.summary",
      label: "Summarize workbook",
      permission: "readWorkbook",
    },
  ];
}

function normalizeAddInSandboxCommand(
  value: unknown,
  permissions: WorkbookAutomationPermission[],
): WorkbookAddInSandboxCommand | null {
  if (!isObject(value)) {
    return null;
  }

  const permission = normalizeAutomationPermission(value.permission);

  if (!permission || !permissions.includes(permission)) {
    return null;
  }

  const idValue = safeText(value.id, id("addin_command"), 100);
  const label = safeText(value.label, "Run add-in command", 120);
  const targetSheetId = safeText(value.targetSheetId, "", 100) || undefined;
  const targetRange = normalizeCommandRange(value.targetRange);

  if (value.kind === "workbook.summary" && permission === "readWorkbook") {
    return {
      id: idValue,
      kind: "workbook.summary",
      label,
      permission,
    };
  }

  if (value.kind === "cell.setValue" && permission === "writeCells") {
    return {
      id: idValue,
      kind: "cell.setValue",
      label,
      permission,
      targetSheetId,
      targetRange,
      value: safeText(value.value, "", 400),
    };
  }

  if (value.kind === "range.fill" && permission === "formatCells") {
    const color = safeText(value.color, "", 24);

    if (!/^#[0-9a-f]{3,8}$/i.test(color)) {
      return null;
    }

    return {
      color,
      id: idValue,
      kind: "range.fill",
      label,
      permission,
      targetSheetId,
      targetRange,
    };
  }

  if (
    value.kind === "data.removeDuplicates" &&
    permission === "sortAndClean"
  ) {
    return {
      id: idValue,
      kind: "data.removeDuplicates",
      label,
      permission,
      targetSheetId,
      targetRange,
    };
  }

  return null;
}

export function normalizeAddInSandboxCommands(
  value: unknown,
  permissions: WorkbookAutomationPermission[],
) {
  if (!Array.isArray(value)) {
    return createDefaultAddInSandboxCommands(permissions);
  }

  const commands = value
    .flatMap((item) => {
      const command = normalizeAddInSandboxCommand(item, permissions);
      return command ? [command] : [];
    })
    .slice(0, 50);

  return commands.length > 0
    ? commands
    : createDefaultAddInSandboxCommands(permissions);
}

function getAddInPackagePayload(input: {
  description: string;
  homepageUrl?: string;
  name: string;
  permissions: WorkbookAutomationPermission[];
  provider: string;
  sandboxCommands: WorkbookAddInSandboxCommand[];
  version: string;
}) {
  return {
    description: input.description,
    homepageUrl: input.homepageUrl ?? "",
    name: input.name,
    permissions: [...input.permissions].sort(),
    provider: input.provider,
    sandboxCommands: input.sandboxCommands.map((command) => ({
      ...command,
      targetRange: "targetRange" in command ? command.targetRange ?? null : null,
      targetSheetId:
        "targetSheetId" in command ? command.targetSheetId ?? "" : "",
    })),
    version: input.version,
  };
}

export function getAddInPackageDigest(input: {
  description: string;
  homepageUrl?: string;
  name: string;
  permissions: WorkbookAutomationPermission[];
  provider: string;
  sandboxCommands: WorkbookAddInSandboxCommand[];
  version: string;
}) {
  return digestPackagePayload(getAddInPackagePayload(input));
}

export function createAddInPackageSignature(input: {
  description: string;
  homepageUrl?: string;
  name: string;
  permissions: WorkbookAutomationPermission[];
  provider: string;
  sandboxCommands: WorkbookAddInSandboxCommand[];
  signedAt: string;
  version: string;
}): WorkbookAddInSignature {
  return {
    algorithm: ADD_IN_SIGNATURE_ALGORITHM,
    signer: input.provider,
    signedAt: input.signedAt,
    value: getAddInPackageDigest(input),
  };
}

export function normalizeAddInSignature(
  value: unknown,
): WorkbookAddInSignature | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  if (value.algorithm !== ADD_IN_SIGNATURE_ALGORITHM) {
    return undefined;
  }

  return {
    algorithm: ADD_IN_SIGNATURE_ALGORITHM,
    signer: safeText(value.signer, "Unknown signer", 100),
    signedAt: safeText(value.signedAt, nowIso(), 40),
    value: safeText(value.value, "", 100),
  };
}

export function getAddInSignatureStatus(input: {
  packageDigest: string;
  signature?: WorkbookAddInSignature;
}): WorkbookAddInSignatureStatus {
  if (!input.signature) {
    return "unsigned";
  }

  return input.signature.value === input.packageDigest ? "verified" : "invalid";
}

export function getAddInDisabledReason(
  candidate: Partial<WorkbookAddInManifest>,
  signatureStatus: WorkbookAddInSignatureStatus,
) {
  if (signatureStatus === "invalid") {
    return "Package signature does not match the manifest.";
  }

  if (signatureStatus === "unsigned") {
    return "Package must be signed before it can be enabled.";
  }

  return safeText(
    candidate.disabledReason,
    "Enable explicitly before running.",
    180,
  );
}
