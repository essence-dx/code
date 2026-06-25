import type {
  ChartRange,
  WorkbookAutomationScript,
  WorkbookAutomationPermission,
  WorkbookAutomationStep,
  WorkbookMacroProject,
} from "@/features/workbooks/types";

export type ImportedVbaProjectInput = {
  binarySize: number;
  name?: string;
  sourceFormat: WorkbookMacroProject["sourceFormat"];
  vbaProjectBase64: string;
  sheetCodeNames?: WorkbookMacroProject["sheetCodeNames"];
};

export type AutomationStepInput = Omit<
  WorkbookAutomationStep,
  "id" | "recordedAt"
>;

const MAX_MACRO_PROJECTS = 6;
const MAX_VBA_BASE64_LENGTH = 12_000_000;
const MAX_AUTOMATION_SCRIPTS = 20;
const MAX_AUTOMATION_STEPS = 250;

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

function normalizePermission(value: unknown): WorkbookAutomationPermission | null {
  return value === "readWorkbook" ||
    value === "writeCells" ||
    value === "formatCells" ||
    value === "manageStructure" ||
    value === "sortAndClean" ||
    value === "registerExtensions"
    ? value
    : null;
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.flatMap((item) => {
        const permission = normalizePermission(item);
        return permission ? [permission] : [];
      }),
    ),
  );
}

export function getAutomationStepPermission(
  command: string,
): WorkbookAutomationPermission | null {
  if (command === "cell.setValue" || command === "range.setValue") {
    return "writeCells";
  }

  if (command.startsWith("format.")) {
    return "formatCells";
  }

  if (command.startsWith("structure.")) {
    return "manageStructure";
  }

  if (command.startsWith("data.")) {
    return "sortAndClean";
  }

  return null;
}

export function getAutomationScriptPermissions(
  steps: WorkbookAutomationStep[],
) {
  return Array.from(
    new Set(
      steps.flatMap((step) => {
        const permission = getAutomationStepPermission(step.command);
        return permission ? [permission] : [];
      }),
    ),
  );
}

function normalizeRange(value: unknown): ChartRange | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = value as Partial<ChartRange>;
  const startRowIndex = Math.max(0, Math.floor(Number(candidate.startRowIndex)));
  const startColumnIndex = Math.max(
    0,
    Math.floor(Number(candidate.startColumnIndex)),
  );
  const endRowIndex = Math.max(
    startRowIndex,
    Math.floor(Number(candidate.endRowIndex)),
  );
  const endColumnIndex = Math.max(
    startColumnIndex,
    Math.floor(Number(candidate.endColumnIndex)),
  );

  if (
    !Number.isFinite(startRowIndex) ||
    !Number.isFinite(startColumnIndex) ||
    !Number.isFinite(endRowIndex) ||
    !Number.isFinite(endColumnIndex)
  ) {
    return undefined;
  }

  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex,
    endColumnIndex,
  };
}

function normalizeHiddenState(
  value: unknown,
): WorkbookMacroProject["sheetCodeNames"][number]["hiddenState"] {
  return value === "hidden" || value === "veryHidden" ? value : "visible";
}

function normalizeSheetCodeNames(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<
        WorkbookMacroProject["sheetCodeNames"][number]
      >;
      const codeName = safeText(candidate.codeName, "", 80);

      if (!codeName) {
        return [];
      }

      return [
        {
          sheetName: safeText(candidate.sheetName, "Sheet", 80),
          codeName,
          hiddenState: normalizeHiddenState(candidate.hiddenState),
        },
      ];
    })
    .slice(0, 100);
}

export function createImportedVbaProject({
  binarySize,
  name,
  sourceFormat,
  vbaProjectBase64,
  sheetCodeNames = [],
}: ImportedVbaProjectInput): WorkbookMacroProject {
  return {
    id: id("macro"),
    name: safeText(name, "Preserved VBA project", 120),
    sourceFormat,
    importedAt: nowIso(),
    disabled: true,
    disabledReason:
      "Preserved for XLSM round-tripping only. Essence Excel never runs imported VBA.",
    binarySize: Math.max(0, Math.floor(binarySize)),
    vbaProjectBase64,
    sheetCodeNames,
  };
}

export function normalizeMacroProjects(value: unknown): WorkbookMacroProject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookMacroProject>;
      const vbaProjectBase64 = safeText(
        candidate.vbaProjectBase64,
        "",
        MAX_VBA_BASE64_LENGTH,
      );

      if (!vbaProjectBase64) {
        return [];
      }

      const macroProject: WorkbookMacroProject = {
        id: safeText(candidate.id, id("macro"), 80),
        name: safeText(candidate.name, "Preserved VBA project", 120),
        sourceFormat: candidate.sourceFormat === "xls" ? "xls" : "xlsm",
        importedAt: safeText(candidate.importedAt, nowIso(), 40),
        disabled: true,
        disabledReason: safeText(
          candidate.disabledReason,
          "Preserved for round-tripping only. Imported macros are never run.",
          240,
        ),
        binarySize: Math.max(0, Math.floor(Number(candidate.binarySize) || 0)),
        vbaProjectBase64,
        sheetCodeNames: normalizeSheetCodeNames(candidate.sheetCodeNames),
      };

      return [macroProject];
    })
    .slice(0, MAX_MACRO_PROJECTS);
}

function normalizeAutomationStep(value: unknown): WorkbookAutomationStep | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<WorkbookAutomationStep>;
  const command = safeText(candidate.command, "", 80);
  const label = safeText(candidate.label, "", 160);

  if (!command || !label) {
    return null;
  }

  return {
    id: safeText(candidate.id, id("step"), 80),
    recordedAt: safeText(candidate.recordedAt, nowIso(), 40),
    command,
    label,
    targetSheetId:
      typeof candidate.targetSheetId === "string"
        ? candidate.targetSheetId.slice(0, 80)
        : undefined,
    targetRange: normalizeRange(candidate.targetRange),
    valuePreview:
      typeof candidate.valuePreview === "string"
        ? candidate.valuePreview.slice(0, 120)
        : undefined,
  };
}

export function normalizeAutomationScripts(
  value: unknown,
): WorkbookAutomationScript[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookAutomationScript>;
      const steps = Array.isArray(candidate.steps)
        ? candidate.steps.flatMap((step) => {
            const normalized = normalizeAutomationStep(step);
            return normalized ? [normalized] : [];
          })
        : [];
      const status =
        candidate.status === "recording"
          ? "recording"
          : candidate.status === "ready"
            ? "ready"
            : "disabled";

      const script: WorkbookAutomationScript = {
        id: safeText(candidate.id, id("script"), 80),
        name: safeText(candidate.name, "Recorded script", 120),
        source: "recorder",
        status,
        disabledReason: safeText(
          candidate.disabledReason,
          status === "ready"
            ? "Ready to run with workbook automation permissions."
            : "Recorded scripts are stored for review and cannot run yet.",
          240,
        ),
        createdAt: safeText(candidate.createdAt, nowIso(), 40),
        updatedAt: safeText(candidate.updatedAt, nowIso(), 40),
        permissions:
          normalizePermissions(candidate.permissions).length > 0
            ? normalizePermissions(candidate.permissions)
            : getAutomationScriptPermissions(steps),
        lastRunAt:
          typeof candidate.lastRunAt === "string"
            ? candidate.lastRunAt.slice(0, 40)
            : undefined,
        lastRunStatus:
          candidate.lastRunStatus === "succeeded" ||
          candidate.lastRunStatus === "failed"
            ? candidate.lastRunStatus
            : undefined,
        lastRunMessage:
          typeof candidate.lastRunMessage === "string"
            ? candidate.lastRunMessage.slice(0, 240)
            : undefined,
        steps: steps.slice(-MAX_AUTOMATION_STEPS),
      };

      return [script];
    })
    .slice(-MAX_AUTOMATION_SCRIPTS);
}

export function startAutomationScript(
  scripts: WorkbookAutomationScript[],
  name: string,
) {
  const timestamp = nowIso();
  const disabledScripts = scripts.map((script) =>
    script.status === "recording"
      ? {
          ...script,
          status: "disabled" as const,
          updatedAt: timestamp,
        }
      : script,
  );

  return [
    ...disabledScripts,
    {
      id: id("script"),
      name: safeText(name, "Recorded script", 120),
      source: "recorder" as const,
      status: "recording" as const,
      disabledReason:
        "Recording workbook commands for a safe replay script.",
      createdAt: timestamp,
      updatedAt: timestamp,
      permissions: [],
      steps: [],
    },
  ].slice(-MAX_AUTOMATION_SCRIPTS);
}

export function stopAutomationScript(
  scripts: WorkbookAutomationScript[],
  scriptId: string,
) {
  const timestamp = nowIso();

  return scripts.map((script) =>
    script.id === scriptId
      ? {
          ...script,
          status: script.steps.length > 0 ? "ready" as const : "disabled" as const,
          disabledReason:
            script.steps.length > 0
              ? "Ready to run with workbook automation permissions."
              : "Record at least one supported workbook command before running.",
          permissions: getAutomationScriptPermissions(script.steps),
          updatedAt: timestamp,
        }
      : script,
  );
}

export function deleteAutomationScript(
  scripts: WorkbookAutomationScript[],
  scriptId: string,
) {
  return scripts.filter((script) => script.id !== scriptId);
}

export function recordAutomationScriptStep(
  scripts: WorkbookAutomationScript[],
  step: AutomationStepInput,
) {
  const timestamp = nowIso();

  return scripts.map((script) =>
    script.status === "recording"
      ? (() => {
          const nextSteps = [
            ...script.steps,
            {
              id: id("step"),
              recordedAt: timestamp,
              ...step,
              valuePreview: step.valuePreview?.slice(0, 120),
            },
          ].slice(-MAX_AUTOMATION_STEPS);

          return {
            ...script,
            updatedAt: timestamp,
            permissions: getAutomationScriptPermissions(nextSteps),
            steps: nextSteps,
          };
        })()
      : script,
  );
}

export function getRecordingAutomationScript(
  scripts: WorkbookAutomationScript[],
) {
  return scripts.find((script) => script.status === "recording") ?? null;
}
